import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { winstonLogger } from './logger/winston.logger';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { HttpExceptionFilter } from './filters/error-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: winstonLogger });
  // const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  const options = new DocumentBuilder()
    .setTitle('Ican swagger api documentation')
    .setDescription('The  API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const Document = SwaggerModule.createDocument(app, options, {
    include: [],
  });
  SwaggerModule.setup('api', app, Document);
  await app.listen(3000);
}
bootstrap();
