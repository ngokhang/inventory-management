import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_KEY } from 'src/decorators/response-message.decorator';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const statusCode = context.switchToHttp().getResponse().statusCode;
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
      map((data) => ({
        success: true,
        statusCode,
        message,
        data: 'data' in data && Array.isArray(data.data) ? data.data : data,
        ...(isPaginated && {
          meta: {
            total: data.total,
            page: data.page,
            limit: data.limit,
            totalPages: data.totalPages,
          },
        }),
      })),
    );
  }
}
