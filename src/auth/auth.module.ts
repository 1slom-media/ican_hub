import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ApiClientModule } from '../api-client/api-client.module';

@Module({
  imports:[ApiClientModule],
  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
