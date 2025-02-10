import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { ApiClientModule } from 'src/api-client/api-client.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [TypeOrmModule.forFeature([], 'secondary'), ApiClientModule,HttpModule],
  providers: [ApplicationService],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
