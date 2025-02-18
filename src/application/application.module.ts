import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { ApiClientModule } from 'src/api-client/api-client.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ApplicationIcanEntity } from './entity/application.entity';
import { ProductsIcanEntity } from './entity/products.entity';
import { ErrorIcanEntity } from './entity/error.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationIcanEntity, ProductsIcanEntity,ErrorIcanEntity],'main'),
    TypeOrmModule.forFeature([], 'secondary'),
    ApiClientModule,
    HttpModule,
  ],
  providers: [ApplicationService],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
