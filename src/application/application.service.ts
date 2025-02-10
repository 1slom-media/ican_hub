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
        success: false,
        message: 'Authorization token is missing',
      };
    }

    const app = await this.appGetOne(data.app_id);

    if (!app) {
      return {
        success: false,
        message: 'Application not found',
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
        return { success: false, message: 'Error fetching period-summ data' };
      }

      limit = periodResponse.result.map((item) => ({
        month: item.period,
        amount: item.value,
      }));

      return {
        success: true,
        limit,
      };
    } else if (app.state == 'failed' || app.status != 'scoring') {
      return {
        success: 'fail',
        message: response.message || 'No limit available',
      };
    } else {
      return {
        success: false,
        message: response.message || 'No limit available',
      };
    }
  }

  async addProduct(data: AddProductDto, req: Request) {
    console.log(data, 'addProduct data');
    const token = req.headers.authorization;
    if (!token) {
      return {
        success: false,
        message: 'Authorization token is missing',
      };
    }

    const app = await this.appGetOne(data.app_id);

    if (!app) {
      return {
        success: false,
        message: 'Application not found',
      };
    }
    try {
      const body = {
        name: data.name,
        amount: data.amount,
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
          success: true,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async getStatus(data: AddPeriodDto, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        success: false,
        message: 'Authorization token is missing',
      };
    }

    const app = await this.appGetOne(data.app_id);

    if (!app) {
      return {
        success: false,
        message: 'Application not found',
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
          success: true,
          is_otp: true,
        };
      } else {
        return {
          success: true,
          is_otp: false,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyOtp(data: VerifyNewClientDto, req: Request) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return {
          success: false,
          message: 'Authorization token is missing',
        };
      }

      const app = await this.appGetOne(data.app_id);

      if (!app) {
        return {
          success: false,
          message: 'Application not found',
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
        return { success: true };
      }

      return {
        success: false,
        message: response.message || 'API request failed',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  async getSchedule(app_id: string, req: Request, res: Response) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        success: false,
        message: 'Authorization token is missing',
      };
    }

    const app = await this.appGetOne(app_id);

    if (!app) {
      return {
        success: false,
        message: 'Application not found',
      };
    }

    const response = await this.apiService.getApi(
      `/application/schedule/${app_id}`,
      token,
    );

    const scheduleFileUrl = response?.result?.schedule_file;

    if (!scheduleFileUrl) {
      return res.status(404).json({
        success: false,
        message: 'Schedule file not found',
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
        success: false,
        message: 'Error downloading the schedule file',
      });
    }
  }

  async getById(app_id: string, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        success: false,
        message: 'Authorization token is missing',
      };
    }

    const app = await this.appGetOne(app_id);
    if (!app) {
      return {
        success: false,
        message: 'Application not found',
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
          success: true,
          data: {
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
        };
      } else {
        return {
          success: false,
          message: 'Failed to fetch application details',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async deleteProductByAppId(app_id: string, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        success: false,
        message: 'Authorization token is missing',
      };
    }

    const app = await this.appGetOne(app_id);

    if (!app) {
      return {
        success: false,
        message: 'Application not found',
      };
    }

    const response = await this.apiService.deleteApiWithToken(
      `/products/application/${app_id}`,
      token,
    );
    if (response.statusCode == true) {
      return {
        success: true,
      };
    }
    return {
      success: false,
      message: response.message,
    };
  }

  async rejectApp(app_id: string, req: Request) {
    const token = req.headers.authorization;
    if (!token) {
      return {
        success: false,
        message: 'Authorization token is missing',
      };
    }

    const app = await this.appGetOne(app_id);

    if (!app) {
      return {
        success: false,
        message: 'Application not found',
      };
    }

    const response = await this.apiService.putApiWithToken(
      `/application/reject/${app.application_id}`,
      token,
      { reject_reason: 'Клиент отказался' },
    );
    if (response.reason_of_reject == 'Клиент отказался') {
      return {
        success: true,
      };
    }
    return {
      success: false,
    };
  }
}
