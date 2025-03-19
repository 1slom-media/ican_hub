import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { IcanBrokerAuthDto, IcanLoginAuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly apiService: ApiClientService) {}

  async loginIcan(data: IcanLoginAuthDto, res) {
    const response = await this.apiService.postApi('/auth/sign-in', {
      username: data.username,
      password: data.password,
    });

    if (response.statusCode === true && response.result) {
      return res.status(200).json({
        status: true,
        result: {
          access_token: response?.result?.access_token,
        },
        error: null,
      });
    }
    return res.status(400).json({
      status: false,
      error: {
        message: response?.message,
      },
      result: null,
    });
  }

  async brokerLogin(data: IcanBrokerAuthDto, res) {
    const response = await this.apiService.postApi('/auth/broker-login', {
      broker_key: data.broker_key,
    });

    if (response.statusCode === true && response.result) {
      return res.status(200).json({
        status: true,
        result: {
          access_token: response?.result?.access_token,
        },
        error: null,
      });
    }
    return res.status(400).json({
      status: false,
      error: {
        message: response?.message,
      },
      result: null,
    });
  }
}
