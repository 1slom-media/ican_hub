import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation } from '@nestjs/swagger';
import { IcanBrokerAuthDto, IcanLoginAuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(public authService: AuthService) {}

  @ApiOperation({ summary: 'Broker key bn kirish' })
  @Post('/broker/login')
  async loginBroker(@Body() data: IcanBrokerAuthDto) {
    return this.authService.brokerLogin(data);
  }

  @ApiOperation({ summary: 'Login parol bn kirish' })
  @Post('/broker/sign-in')
  async loginIcan(@Body() data: IcanLoginAuthDto) {
    return this.authService.loginIcan(data);
  }
}
