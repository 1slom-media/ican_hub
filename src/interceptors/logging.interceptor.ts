import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Interceptor');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, body, query, params } = req;

    this.logger.log(
      `METHOD: ${method} URL: ${originalUrl} Body: ${JSON.stringify(body)} Query: ${JSON.stringify(query)} Params: ${JSON.stringify(params)}`,
    );

    const now = Date.now();
    return next.handle().pipe(
      tap((data) => {
        const res = context.switchToHttp().getResponse();
        this.logger.log(
          `Response Status: ${res.statusCode} Response Time: ${Date.now() - now}ms Response Data: ${JSON.stringify(data)}`,
        );
      }),
    );
  }
}
