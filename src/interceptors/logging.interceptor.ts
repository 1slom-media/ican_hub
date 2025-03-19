import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import * as fs from 'fs';
import * as path from 'path';
import { inspect } from 'util';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Interceptor');
  private readonly logFilePath = path.join(__dirname, '../../logs/app.log');

  // 🔹 Xavfsiz JSON.stringify funksiyasi (BigInt, Buffer, Circular reference muammolarini hal qiladi)
  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(
        obj,
        (_, value) => {
          if (typeof value === 'bigint') return value.toString(); // BigInt uchun
          if (value instanceof Buffer) return value.toString('base64'); // Buffer uchun
          return value;
        },
        2,
      );
    } catch (error) {
      return inspect(obj, { depth: 5 }); // Agar JSON.stringify ishlamasa, inspect bilan chiqarish
    }
  }

  // 🔹 Log ma’lumotlarini faylga yozish
  private writeLogToFile(log: object) {
    const logEntry = this.safeStringify(log) + ',\n';
    fs.appendFile(this.logFilePath, logEntry, (err) => {
      if (err) {
        this.logger.error('Failed to write log:', err.message);
      }
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, originalUrl, body, query, params, headers } = req;

    // 🔹 Keraksiz headerlarni filtrlaymiz
    const filteredHeaders = {
      authorization: headers.authorization || null,
      host: headers.host || null,
      referer: headers.referer || null,
      'user-agent': headers['user-agent'] || null,
    };

    // 🔹 So‘rov logini yozish
    const requestLog = {
      timestamp: new Date().toISOString(),
      type: 'request',
      method,
      url: originalUrl,
      headers: filteredHeaders,
      body,
      query,
      params,
    };
    this.writeLogToFile(requestLog);

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        // 🔹 Javob logini yozish
        const responseLog = {
          timestamp: new Date().toISOString(),
          type: 'response',
          statusCode: res.statusCode,
          responseTime: `${Date.now() - now}ms`,
        };

        this.writeLogToFile(responseLog);
      }),
    );
  }
}
