import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { IcanBrokerAuthDto, IcanLoginAuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly apiService: ApiClientService) {}

  async loginIcan(data: IcanLoginAuthDto) {
    const response = await this.apiService.postApi('/auth/sign-in', {
      username: data.username,
      password: data.password,
    });

    if (response.statusCode === true && response.result) {
      return {
        status: true,
        result: {
          access_token: response?.result?.access_token,
        },
        error: null,
      };
    }
    return {
      status: false,
      result: null,
      error: {
        message: response?.message,
      },
    };
  }

  async brokerLogin(data: IcanBrokerAuthDto) {
    const response = await this.apiService.postApi('/auth/broker-login', {
      broker_key: data.broker_key,
    });

    if (response.statusCode === true && response.result) {
      return {
        status: true,
        result: {
          access_token: response?.result?.access_token,
        },
        error: null,
      };
    }
    return {
      status: false,
      result: null,
      error: {
        message: response?.message,
      },
    };
  }
}
