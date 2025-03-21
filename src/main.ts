import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { winstonLogger } from './logger/winston.logger';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { HttpExceptionFilter } from './filters/error-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        function extractErrorMessage(errors) {
          for (const error of errors) {
            if (error.constraints) {
              return Object.values(error.constraints)[0]; // Birinchi xatoni olish
            }
            if (error.children?.length) {
              return extractErrorMessage(error.children); // Ichki validatsiyalarni tekshirish
            }
          }
          return 'Validation failed';
        }
  
        return new BadRequestException({
          status: false,
          error: { message: extractErrorMessage(errors) },
          result: null,
        });
      },
    }),
  );
   
   
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors();

  const options = new DocumentBuilder()
    .setTitle('Ican swagger api documentation')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
