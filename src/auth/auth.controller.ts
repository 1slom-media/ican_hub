import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation } from '@nestjs/swagger';
import { IcanBrokerAuthDto, IcanLoginAuthDto } from './dto/auth.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(public authService: AuthService) {}

  @ApiOperation({ summary: 'Broker key bn kirish' })
  @Post('/broker/login')
  async loginBroker(@Body() data: IcanBrokerAuthDto,@Res() res:Response) {
    return this.authService.brokerLogin(data,res);
  }

  @ApiOperation({ summary: 'Login parol bn kirish' })
  @Post('/broker/sign-in')
  async loginIcan(@Body() data: IcanLoginAuthDto,@Res() res:Response) {
    return this.authService.loginIcan(data,res);
  }
}
