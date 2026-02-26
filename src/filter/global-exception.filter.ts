// src/common/filters/global-exception.filter.ts

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { STATUS_CODES } from 'http';
import { Prisma } from 'prisma/generated/client';

/**
 * ApiErrorResponse
 * Schema lỗi RESTful, nhất quán cho toàn dự án.
 *
 * - message: string (ổn định, phù hợp cho hiển thị)
 * - details: object (chi tiết cho debug / client logic)
 *
 * NOTE: Không bao giờ trả stack/cause ra client ở production.
 * NestJS docs cũng nhấn mạnh `cause` không được serialize vào response,
 * nhưng hữu ích cho logging nội bộ.
 */
export interface ApiErrorResponse<TDetails = Record<string, unknown>> {
  statusCode: number;
  error: string;
  message: string;
  details?: TDetails;

  path: string;
  method: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Context thông tin request dùng để đóng gói response.
 * Tách riêng để dễ unit-test.
 */
export interface NormalizeContext {
  path: string;
  method: string;
  requestId?: string;
  /**
   * “production” nghĩa là không leak chi tiết nội bộ.
   * Bạn có thể thay bằng config service nếu muốn.
   */
  isProduction: boolean;
}

interface NormalizedParts {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

type RequestWithMeta = Request & {
  id?: unknown;
  headers?: Record<string, unknown>;
};

/**
 * Hàm thuần (pure-ish) để dễ unit-test:
 * - Nhận exception unknown + context
 * - Trả về response schema chuẩn hóa
 */
export function normalizeException(
  exception: unknown,
  ctx: NormalizeContext,
): ApiErrorResponse {
  const parts =
    mapHttpException(exception) ??
    mapPrismaException(exception) ??
    mapHttpErrorsStyle(exception) ??
    mapUnknownException(exception, ctx.isProduction);

  return {
    statusCode: parts.statusCode,
    error: parts.error,
    message: parts.message,
    ...(parts.details ? { details: parts.details } : {}),
    path: ctx.path,
    method: ctx.method,
    timestamp: new Date().toISOString(),
    ...(ctx.requestId ? { requestId: ctx.requestId } : {}),
  };
}

/**
 * Global exception filter
 * - Platform-agnostic nhờ HttpAdapterHost
 * - Logging tập trung
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // NestJS khuyến nghị resolve httpAdapter trong catch()
    const { httpAdapter } = this.httpAdapterHost;

    const httpCtx = host.switchToHttp();
    const req = httpCtx.getRequest<unknown>();
    const res = httpCtx.getResponse<unknown>();

    const method = getRequestMethod(req, httpAdapter);
    const path = getRequestPath(req, httpAdapter);

    const requestId = extractRequestId(req);

    const isProduction = process.env.NODE_ENV === 'production';

    const body = normalizeException(exception, {
      path,
      method,
      requestId,
      isProduction,
    });

    this.logBySeverity(exception, body, isProduction);

    httpAdapter.reply(res, body, body.statusCode);
  }

  private logBySeverity(
    exception: unknown,
    normalized: ApiErrorResponse,
    isProduction: boolean,
  ): void {
    const base = {
      requestId: normalized.requestId,
      method: normalized.method,
      path: normalized.path,
      statusCode: normalized.statusCode,
      error: normalized.error,
      message: normalized.message,
      details: normalized.details,
    };

    const stack = exception instanceof Error ? exception.stack : undefined;

    // 4xx: warn; 5xx: error
    if (normalized.statusCode >= 500) {
      // production: tránh log “details quá nhạy cảm” nếu bạn coi upstream payload là nhạy cảm
      // (ở đây vẫn log base; bạn có thể redact tùy nhu cầu).
      this.logger.error(
        safeJsonStringify(base),
        isProduction ? undefined : stack,
      );
    } else {
      this.logger.warn(safeJsonStringify(base));
    }
  }
}

/* ----------------------------- Mapping rules ----------------------------- */

/**
 * 1) HttpException:
 * - Bao gồm BadRequestException từ ValidationPipe.
 */
function mapHttpException(exception: unknown): NormalizedParts | null {
  if (!(exception instanceof HttpException)) return null;

  const statusCode = exception.getStatus();
  const reason = reasonPhrase(statusCode);

  const response = exception.getResponse();

  // NestJS cho phép response là `string` hoặc object
  if (typeof response === 'string') {
    return {
      statusCode,
      error: reason,
      message: safeMessage(response, 300),
    };
  }

  if (isRecord(response)) {
    const rawError =
      typeof response.error === 'string' ? response.error : reason;

    // ValidationPipe mặc định: { statusCode: 400, error: "Bad Request", message: string[] }
    if (
      statusCode === Number(HttpStatus.BAD_REQUEST) &&
      Array.isArray(response.message)
    ) {
      const errors = response.message
        .filter((x) => typeof x === 'string')
        .map((x) => safeMessage(x, 500));

      return {
        statusCode,
        error: rawError,
        message: 'Validation failed',
        details: {
          errors,
        },
      };
    }

    // HttpException “thường”: message có thể là string
    const msg =
      typeof response.message === 'string'
        ? response.message
        : exception.message;

    const details = isRecord(response.details) ? response.details : undefined;

    return {
      statusCode,
      error: rawError,
      message: safeMessage(msg || reason, 500),
      ...(details ? { details: { ...details } } : {}),
    };
  }

  // Fallback bất ngờ
  return {
    statusCode,
    error: reason,
    message: safeMessage(exception.message || reason, 500),
  };
}

/**
 * 2) Prisma:
 * - Ưu tiên KnownRequestError theo code.
 * - Có thêm “duck-typing” để tăng khả năng nhận diện trong runtime khác nhau.
 */
function mapPrismaException(exception: unknown): NormalizedParts | null {
  const known = asPrismaKnownRequestError(exception);
  if (!known) {
    const validation = asPrismaClientValidationError(exception);
    if (validation) {
      // PrismaClientValidationError: validation fails (missing field / wrong type...)
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: reasonPhrase(HttpStatus.BAD_REQUEST),
        message: 'Invalid database query',
        details: {
          prisma: {
            name: validation.name,
            clientVersion: validation.clientVersion,
          },
        },
      };
    }

    // Các Prisma lỗi khác có thể map 500 (extension point).
    return null;
  }

  const code = known.code;
  const meta = isRecord(known.meta) ? known.meta : undefined;

  // Rule: Prisma unique constraint -> 409
  if (code === 'P2002') {
    return {
      statusCode: HttpStatus.CONFLICT,
      error: reasonPhrase(HttpStatus.CONFLICT),
      message: 'Unique constraint violation',
      details: {
        prisma: {
          code,
          // docs chỉ đảm bảo meta có thể chứa “additional information”
          // (ví dụ target fields). Nếu không có, giữ undefined.
          target: meta?.target,
          modelName: meta?.modelName,
        },
      },
    };
  }

  // Rule: Prisma not found -> 404
  if (code === 'P2025') {
    return {
      statusCode: HttpStatus.NOT_FOUND,
      error: reasonPhrase(HttpStatus.NOT_FOUND),
      message: 'Resource not found',
      details: {
        prisma: {
          code,
          modelName: meta?.modelName,
        },
      },
    };
  }

  // Rule: Prisma foreign key -> 409 (default) / 400 (tuỳ dự án)
  if (code === 'P2003') {
    return {
      statusCode: HttpStatus.CONFLICT,
      error: reasonPhrase(HttpStatus.CONFLICT),
      message: 'Foreign key constraint failed',
      details: {
        prisma: {
          code,
          field: meta?.field_name,
          modelName: meta?.modelName,
          // Extension point: bạn có thể thêm “mode: 400|409” theo method/path
        },
      },
    };
  }

  // Rule: “query errors” -> 500 (parse/validate/interpret query)
  if (isPrismaQueryErrorCode(code)) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR),
      message: 'Internal server error',
      details: {
        prisma: {
          code,
        },
      },
    };
  }

  // Các Prisma known lỗi còn lại: tùy triết lý dự án.
  // Ở đây chọn “an toàn”: 500, tránh leak thông tin database.
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR),
    message: 'Internal server error',
    details: {
      prisma: {
        code,
      },
    },
  };
}

/**
 * 4) “http-errors style”: NestJS built-in filter cũng “partially supports http-errors”
 * khi exception có statusCode/message.
 */
function mapHttpErrorsStyle(exception: unknown): NormalizedParts | null {
  if (!isRecord(exception)) return null;

  const statusCode =
    typeof exception.statusCode === 'number' ? exception.statusCode : undefined;

  const message =
    typeof exception.message === 'string' ? exception.message : undefined;

  if (!statusCode || !message) return null;

  return {
    statusCode,
    error: reasonPhrase(statusCode),
    message: safeMessage(message, 800),
  };
}

/**
 * 5) Unknown fallback -> 500.
 * - Production: message generic
 * - Non-prod: message “có thể đọc được” nhưng vẫn không trả stack qua response.
 */
function mapUnknownException(
  exception: unknown,
  isProduction: boolean,
): NormalizedParts {
  if (isProduction) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR),
      message: 'Internal server error',
    };
  }

  if (exception instanceof Error) {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR),
      message: safeMessage(exception.message || 'Internal server error', 800),
      details: {
        name: exception.name,
      },
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    error: reasonPhrase(HttpStatus.INTERNAL_SERVER_ERROR),
    message: 'Internal server error',
    details: {
      received: safeJsonStringify(exception),
    },
  };
}

/* ------------------------------ Type guards ------------------------------ */

function asPrismaKnownRequestError(
  e: unknown,
): Prisma.PrismaClientKnownRequestError | null {
  // Official pattern is `e instanceof Prisma.PrismaClientKnownRequestError`
  // nhưng thực tế có thể gặp “instanceof mismatch” trong một số build setups,
  // nên bổ sung duck-typing theo name/code.
  if (e instanceof Prisma.PrismaClientKnownRequestError) return e;

  if (
    isRecord(e) &&
    e.name === 'PrismaClientKnownRequestError' &&
    typeof e.code === 'string'
  ) {
    return e as Prisma.PrismaClientKnownRequestError;
  }

  return null;
}

function asPrismaClientValidationError(
  e: unknown,
): Prisma.PrismaClientValidationError | null {
  if (e instanceof Prisma.PrismaClientValidationError) return e;

  if (isRecord(e) && e.name === 'PrismaClientValidationError') {
    return e as Prisma.PrismaClientValidationError;
  }
  return null;
}

function isPrismaQueryErrorCode(code: string): boolean {
  // Theo Prisma error reference: parse/validate/interpret query.
  return code === 'P2008' || code === 'P2009' || code === 'P2016';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/* ------------------------------- Utilities -------------------------------- */

function reasonPhrase(statusCode: number): string {
  // STATUS_CODES là mapping chuẩn của Node.js
  return STATUS_CODES[statusCode] ?? 'Error';
}

function safeMessage(input: string, maxLen: number): string {
  const s = String(input ?? '').trim();
  if (!s) return 'Error';
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
}

function safeJsonStringify(value: unknown): string {
  try {
    const seen = new WeakSet<object>();
    return JSON.stringify(
      value,
      (_k: string, v: unknown) => {
        if (typeof v === 'object' && v !== null) {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return v;
      },
      2,
    );
  } catch {
    return '[Unserializable]';
  }
}

function getRequestMethod(
  req: unknown,
  httpAdapter: HttpAdapterHost['httpAdapter'],
): string {
  if (
    isRecord(req) &&
    typeof req.method === 'string' &&
    req.method.trim().length > 0
  ) {
    return req.method;
  }

  if (typeof httpAdapter.getRequestMethod === 'function') {
    const method: unknown = (
      httpAdapter.getRequestMethod as (request: unknown) => unknown
    ).call(httpAdapter, req);
    if (typeof method === 'string' && method.trim().length > 0) {
      return method;
    }
  }

  return 'UNKNOWN';
}

function getRequestPath(
  req: unknown,
  httpAdapter: HttpAdapterHost['httpAdapter'],
): string {
  if (typeof httpAdapter.getRequestUrl === 'function') {
    const path: unknown = (
      httpAdapter.getRequestUrl as (request: unknown) => unknown
    ).call(httpAdapter, req);
    if (typeof path === 'string' && path.trim().length > 0) {
      return path;
    }
  }

  if (
    isRecord(req) &&
    typeof req.url === 'string' &&
    req.url.trim().length > 0
  ) {
    return req.url;
  }

  return 'UNKNOWN';
}

function extractRequestId(req: unknown): string | undefined {
  if (!isRecord(req)) {
    return undefined;
  }

  const request = req as RequestWithMeta;
  const headers = request.headers ?? {};
  const v =
    headers['x-request-id'] ??
    headers['x-correlation-id'] ??
    headers['x-correlationid'] ??
    request.id;

  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
