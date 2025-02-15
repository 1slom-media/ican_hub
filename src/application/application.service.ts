import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { Request, Response } from 'express';
import {
  AddPeriodDto,
  AddProductDto,
  GetLimitDto,
  VerifyNewClientDto,
} from './dto/application.dto';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectDataSource('secondary')
    private readonly secondaryDataSource: DataSource,
    private readonly apiService: ApiClientService,
    private readonly httpService: HttpService,
  ) {}

  // aplication db get one
  async appGetOne(id: string) {
    const reportsRepo = this.secondaryDataSource.getRepository('applications');
    const query = `
        SELECT id, status, state
        FROM applications WHERE id = $1;
    `;
    const result = await reportsRepo.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  async getLimit(data: GetLimitDto, req: Request) {
    console.log(data, 'limit data');
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        error: {
          message: 'Authorization token is missing',
        },
        result: null,
      };
    }

    const app = await this.appGetOne(data.app_id);

    if (!app) {
      return {
        status: false,
        error: {
          message: 'Application not found',
        },
        result: null,
      };
    }

    const response = await this.apiService.getApi(
      `/application/scoring/${data.app_id}`,
      token,
    );

    if (response.limit_amount > 0) {
      let limit = [];
      const periodResponse = await this.apiService.getApi(
        `/application/period-summ?modelId=${data.merchant_id}&modelName=merchant&summ=${response.limit_amount}`,
        token,
      );

      if (periodResponse.statusCode !== 200 || !periodResponse.result) {
        return {
          status: false,
          error: { message: 'Error fetching period-summ data' },
        };
      }

      limit = periodResponse.result.map((item) => ({
        month: item.period,
        amount: item.value,
      }));

      return {
        status: true,
        result: { provider: response?.provider, limit },
        error: null,
      };
    } else if (app.state == 'failed' || app.status != 'scoring') {
      return {
        status: false,
        error: {
          message: response.message || 'No limit available',
        },
        result: null,
      };
    } else {
      return {
        status: true,
        result: { message: 'waiting' },
        error: null,
      };
    }
  }

  async addProduct(data: AddProductDto, req: Request) {
    console.log(data, 'addProduct data');
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        error: {
          message: 'Authorization token is missing',
        },
        result: null,
      };
    }

    const app = await this.appGetOne(data.app_id);

    if (!app) {
      return {
        status: false,
        error: {
          message: 'Application not found',
        },
        result: null,
      };
    }
    try {
      const body = {
        name: data.name,
        amount: data.amount,
        price: data.amount,
        count: 1,
        application: data.app_id,
      };

      const response = await this.apiService.postApiWithToken(
        '/products',
        token,
        body,
      );
      if (response.statusCode === true && response.result) {
        return {
          status: true,
          error: null,
          result: {
            name: data.name,
            amount: data.amount,
          },
        };
      }
    } catch (error) {
      return {
        status: false,
        result: null,
        error: {
          message: error.message,
        },
      };
    }
  }

  async addPeriod(data: AddPeriodDto, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Authorization token is missing',
        },
      };
    }

    const app = await this.appGetOne(data.app_id);

    if (!app) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Application not found',
        },
      };
    }

    try {
      const response = await this.apiService.postApiWithToken(
        `/application/approve/${data.app_id}`,
        token,
        { period: app.period },
      );
      console.log(response, 'period');

      const apiResponse = await this.apiService.getApi(
        `/application/get/status/${data.app_id}`,
        token,
      );
      const { is_anorbank_new_client } = apiResponse?.result;
      if (is_anorbank_new_client === true) {
        return {
          status: true,
          result: {
            is_otp: true,
          },
          error: null,
        };
      } else {
        return {
          status: true,
          result: {
            is_otp: true,
          },
          error: null,
        };
      }
    } catch (error) {
      return {
        status: false,
        result: null,
        error: {
          message: error.message,
        },
      };
    }
  }

  async getStatus(app_id: string, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Authorization token is missing',
        },
      };
    }

    const app = await this.appGetOne(app_id);

    if (!app) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Application not found',
        },
      };
    }

    try {
      const apiResponse = await this.apiService.getApi(
        `/application/get/status/${app_id}`,
        token,
      );
      if (apiResponse.statusCode === 200 && apiResponse.result) {
        const { result } = apiResponse;
        const data = {
          id: result.id,
          b_status: result.b_status,
          b_state: result.b_state,
          status: result.status,
          state: result.state,
          is_anorbank_new_client: result.is_anorbank_new_client,
        };
        return {
          status: true,
          result: data,
          error: null,
        };
      } else {
        return {
          status: false,
          result: null,
          error: {
            message: apiResponse.message,
          },
        };
      }
    } catch (error) {
      return {
        status: false,
        result: null,
        error: {
          message: error.message,
        },
      };
    }
  }

  async verifyOtp(data: VerifyNewClientDto, req: Request) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return {
          status: false,
          result: null,
          error: {
            message: 'Authorization token is missing',
          },
        };
      }

      const app = await this.appGetOne(data.app_id);

      if (!app) {
        return {
          status: false,
          result: null,
          error: {
            message: 'Application not found',
          },
        };
      }

      const body = {
        id: data.app_id,
        otp: data.otp,
      };

      const response = await this.apiService.postApiWithToken(
        '/application/otp?type=new_client',
        token,
        body,
      );
      if (response.statusCode === 201) {
        return { status: true, result: { message: 'success' }, error: null };
      }

      return {
        status: false,
        result: null,
        error: {
          message: response.message || 'API request failed',
        },
      };
    } catch (error) {
      return {
        status: false,
        result: null,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      };
    }
  }

  async getSchedule(app_id: string, req: Request, res: Response) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Authorization token is missing',
        },
      };
    }

    const app = await this.appGetOne(app_id);

    if (!app) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Application not found',
        },
      };
    }

    const response = await this.apiService.getApi(
      `/application/schedule/${app_id}`,
      token,
    );

    const scheduleFileUrl = response?.result?.schedule_file;

    if (!scheduleFileUrl) {
      return res.status(404).json({
        status: false,
        result: null,
        error: {
          message: 'Schedule file not found',
        },
      });
    }

    try {
      const fileResponse = await this.httpService.axiosRef({
        url: scheduleFileUrl,
        method: 'GET',
        responseType: 'stream',
      });

      const safeFilename = encodeURIComponent(
        response.result.filename || 'schedule',
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFilename}.pdf"`,
      );

      fileResponse.data.pipe(res);
    } catch (error) {
      console.error('Error downloading the schedule file:', error);
      return res.status(500).json({
        status: false,
        result: null,
        error: {
          message: 'Error downloading the schedule file',
        },
      });
    }
  }

  async getById(app_id: string, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Authorization token is missing',
        },
      };
    }

    const app = await this.appGetOne(app_id);
    if (!app) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Application not found',
        },
      };
    }

    try {
      const response = await this.apiService.getApi(
        `/application/get/${app_id}`,
        token,
      );

      if (response.statusCode === 200 && response.result) {
        const result = response.result;

        return {
          status: true,
          result: {
            id: result.id,
            period: result.period,
            provider: result.provider,
            owner_phone: result.owner_phone,
            close_phone: result.close_phone,
            user: {
              name: result.user?.name,
              surname: result.user?.surname,
              fathers_name: result.user?.fathers_name,
            },
            merchant: {
              modelId: result.merchant?.id,
              name: result.merchant?.name,
            },
            products: result.products || [],
          },
          error: null,
        };
      } else {
        return {
          status: false,
          result: null,
          error: {
            message: 'Failed to fetch application details emulator',
          },
        };
      }
    } catch (error) {
      return {
        status: false,
        result: null,
        error: {
          message: error.message,
        },
      };
    }
  }

  async deleteProductByAppId(app_id: string, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Authorization token is missing',
        },
      };
    }

    const app = await this.appGetOne(app_id);

    if (!app) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Application not found',
        },
      };
    }

    const response = await this.apiService.deleteApiWithToken(
      `/products/application/${app_id}`,
      token,
    );
    if (response.statusCode == true) {
      return {
        status: true,
        result: { message: 'success' },
        error: null,
      };
    }
    return {
      status: false,
      result: null,
      error: {
        message: response.message,
      },
    };
  }

  async rejectApp(app_id: string, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Authorization token is missing',
        },
      };
    }

    const app = await this.appGetOne(app_id);

    if (!app) {
      return {
        status: false,
        result: null,
        error: {
          message: 'Application not found',
        },
      };
    }

    const response = await this.apiService.putApiWithToken(
      `/application/reject/${app_id}`,
      token,
      { reject_reason: 'Клиент отказался' },
    );
    if (response.reason_of_reject == 'Клиент отказался') {
      return {
        status: true,
        result: { message: 'success' },
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
