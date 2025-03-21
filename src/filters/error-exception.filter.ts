import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const exceptionResponse: any = exception.getResponse();

    let errorMessage = 'Invalid request';

    // `message` har xil formatda bo‘lishi mumkin, uni tekshiramiz
    if (exceptionResponse?.error?.message) {
      errorMessage = exceptionResponse.error.message;
    } else if (Array.isArray(exceptionResponse.message)) {
      errorMessage = exceptionResponse.message.join(', ');
    } else if (typeof exceptionResponse.message === 'string') {
      errorMessage = exceptionResponse.message;
    }

    response.status(400).json({
      status: false,
      error: { message: errorMessage },
      result: null,
    });
  }
}
