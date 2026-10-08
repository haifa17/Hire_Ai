import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode: number = response.statusCode || HttpStatus.OK;

        const isEnvelope = this.isResponseEnvelope(data);
        const message: string = isEnvelope
          ? data?.message ?? this.defaultMessage(statusCode)
          : this.defaultMessage(statusCode);

        const payload = isEnvelope ? data?.data : data;

        return {
          success: true,
          statusCode,
          message,
          data: payload,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  private defaultMessage(status: number): string {
    const messages: Record<number, string> = {
      200: 'Success',
      201: 'Created successfully',
      204: 'No content',
    };
    return messages[status] ?? 'Success';
  }

  private isResponseEnvelope(data: unknown): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const record = data as Record<string, unknown>;
    return (
      'data' in record ||
      'success' in record ||
      'statusCode' in record ||
      'timestamp' in record ||
      'path' in record
    );
  }
}
