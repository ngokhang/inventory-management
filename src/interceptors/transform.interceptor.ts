import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';
import { RESPONSE_MESSAGE_KEY } from 'src/decorators/response-message.decorator';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T | PaginatedResponse<T>>,
  ): Observable<unknown> {
    const response = context
      .switchToHttp()
      .getResponse<{ statusCode: number }>();
    const statusCode = response.statusCode;
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'OK';
    const isPaginated = this.reflector.getAllAndOverride<boolean>('paginated', [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((data) => {
        const isPaginatedData =
          data !== null &&
          typeof data === 'object' &&
          'data' in data &&
          Array.isArray(data.data);

        const paginated = isPaginatedData ? data : null;

        return {
          success: true,
          statusCode,
          message,
          data: paginated ? paginated.data : data,
          ...(isPaginated &&
            paginated && {
              meta: {
                total: paginated.total,
                page: paginated.page,
                limit: paginated.limit,
                totalPages: paginated.totalPages,
              },
            }),
        };
      }),
    );
  }
}
