import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApplicationModule } from './application/application.module';
import { ApiClientModule } from './api-client/api-client.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ApplicationIcanEntity } from './application/entity/application.entity';
import { ProductsIcanEntity } from './application/entity/products.entity';
import { ErrorIcanEntity } from './application/entity/error.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // main db
    TypeOrmModule.forRoot({
      name: 'main',
      type: 'postgres',
      host: process.env.PG_HOST,
      port: parseInt(process.env.PG_PORT ?? '5432'),
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      entities: [ApplicationIcanEntity,ProductsIcanEntity,ErrorIcanEntity],
      synchronize: true,
    }),
    // nasiya db connection
    TypeOrmModule.forRoot({
      name: 'secondary',
      type: 'postgres',
      host: process.env.SECONDARY_PG_HOST,
      port: parseInt(process.env.SECONDARY_PG_PORT ?? '5432'),
      username: process.env.SECONDARY_PG_USER,
      password: process.env.SECONDARY_PG_PASSWORD,
      database: process.env.SECONDARY_PG_DATABASE,
      entities: [],
      synchronize: true,
    }),
    ApplicationModule,
    ApiClientModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
