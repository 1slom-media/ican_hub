import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { Request } from 'express';
import {
  CreateProductIcanDto,
  GetLimitDto,
  VerifyNewClientDto,
} from './dto/application.dto';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ApplicationIcanEntity } from './entity/application.entity';
import { ProductsIcanEntity } from './entity/products.entity';
import { ErrorIcanEntity } from './entity/error.entity';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectDataSource('secondary')
    private readonly secondaryDataSource: DataSource,
    @InjectRepository(ApplicationIcanEntity, 'main')
    private readonly applicationRepo: Repository<ApplicationIcanEntity>,
    @InjectRepository(ProductsIcanEntity, 'main')
    private readonly productRepo: Repository<ProductsIcanEntity>,
    @InjectRepository(ErrorIcanEntity, 'main')
    private readonly errorRepo: Repository<ErrorIcanEntity>,
    private readonly apiService: ApiClientService,
    private readonly httpService: HttpService,
  ) {}

  // aplication db get one
  async appGetOne(id: string) {
    const reportsRepo = this.secondaryDataSource.getRepository('applications');
    const query = `
SELECT 
    a.id, 
    a.status, 
    a.state, 
    a.owner_phone, 
    a.close_phone, 
    c.name, 
    c.surname,
    c.fathers_name
FROM applications a
JOIN client_user c ON a."user" = c.id
WHERE a.id = $1;
    `;
    const result = await reportsRepo.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // get limit
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
    await this.applicationRepo.save(app.id);
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

  // add product add + period + delete product
  async addProduct(data: CreateProductIcanDto, req: Request) {
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
      await this.applicationRepo.update(
        { app_id: data.app_id },
        { period: data.period },
      );

      for (const product of data.products) {
        const body = {
          name: product.name,
          amount: product.amount,
          price: product.amount,
          count: 1,
          application: data.app_id,
        };

        const response = await this.apiService.postApiWithToken(
          '/products',
          token,
          body,
        );
        if (response.statusCode === true && response.result) {
          const productEntity = new ProductsIcanEntity();
          productEntity.app_id = response.result.application.toString();
          productEntity.product_id = response.result.id.toString();
          productEntity.name = response.result.name;
          productEntity.amount = response.result.amount.toString();
          await this.productRepo.save(productEntity);
        }
      }

      const periodResponse = await this.apiService.postApiWithToken(
        `/application/approve/${data.app_id}`,
        token,
        { period: data.period },
      );
      console.log(`Period response->:`, periodResponse);
      if (periodResponse.statusCode === 400) {
        await this.deleteProductByAppId(data.app_id, req);
        return {
          status: false,
          error: {
            message: periodResponse.message,
          },
          result: null,
        };
      }
      const apiResponse = await this.apiService.getApi(
        `/application/get/status/${data.app_id}`,
        token,
      );
      const { b_state, b_status, is_anorbank_new_client } = apiResponse.result;

      // error bank state
      // const error = await this.errorRepo.findOne({
      //   where: { b_state, b_status },
      // });
      // if (error) {
      //   const deleted = await this.deleteProductByAppId(data.app_id, req);
      //   console.log(deleted, 'dlt');
      //   return {
      //     status: false,
      //     error: {
      //       message: error.description,
      //     },
      //     result: null,
      //   };
      // }

      if (is_anorbank_new_client === true) {
        return {
          status: true,
          result: {
            client_info: {
              name: app?.name,
              surname: app?.surname,
              fathers_name: app?.fathers_name,
              owner_phone: app?.owner_phone,
              close_phone: app?.close_phone,
            },
            is_otp: true,
          },
          error: null,
        };
      } else {
        return {
          status: true,
          result: {
            client_info: {
              name: app?.name,
              surname: app?.surname,
              fathers_name: app?.fathers_name,
              owner_phone: app?.owner_phone,
              close_phone: app?.close_phone,
            },
            is_otp: false,
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

  // get info
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

      const apiResponse = await this.apiService.getApi(
        `/application/get/status/${app_id}`,
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
            b_status: apiResponse.result.b_status,
            b_state: apiResponse.result.b_state,
            status: apiResponse.result.status,
            state: apiResponse.result.state,
            is_anorbank_new_client: apiResponse.result.is_anorbank_new_client,
            client_info: {
              name: result.user?.name,
              surname: result.user?.surname,
              fathers_name: result.user?.fathers_name,
              owner_phone: result.owner_phone,
              close_phone: result.close_phone,
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

  // verify otp
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

  // get contract
  async getSchedule(app_id: string, req: Request) {
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
      return {
        status: false,
        result: null,
        error: {
          message: 'Schedule file not found',
        },
      };
    }

    try {
      return {
        status: true,
        result: {
          pdf_url: scheduleFileUrl,
          month: response?.result?.contract_period,
          client_full_name: response?.result?.client_full_name,
        },
        error: null,
      };
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

  // delete product
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

  // reject product
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
