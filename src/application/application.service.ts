import { Injectable } from '@nestjs/common';
import { ApiClientService } from '../api-client/api-client.service';
import { Request, Response } from 'express';
import {
  CalculatePerMonthDto,
  CreateProductIcanDto,
  GetLimitDto,
  ResendOtpDto,
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
    a.limit_amount, 
    a.owner_phone, 
    a.close_phone, 
    a.reason_error_davrbank,
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
  async getLimit(data: GetLimitDto, req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          error: {
            message: 'Authorization token is missing',
          },
          result: null,
        });
      }

      const app = await this.appGetOne(data.app_id);

      if (!app) {
        return res.status(404).json({
          status: false,
          error: {
            message: 'Application not found',
          },
          result: null,
        });
      }

      const response = await this.apiService.getApi(
        `/application/scoring/${data.app_id}`,
        token,
      );
      await this.applicationRepo.save({ app_id: data.app_id });

      if (response.limit_amount > 0) {
        let limit: { month: number; amount: number }[] = [];

        if (response.provider === 'DAVRBANK') {
          const months = [3, 6, 9, 12];
          limit = months.map((month) => ({
            month: month,
            amount: (response.limit_amount / 12) * month,
          }));
        } else if (response.provider === 'ANORBANK') {
          const periodResponse = await this.apiService.getApi(
            `/application/period-summ?modelId=${data.merchant_id}&modelName=merchant&summ=${response.limit_amount}&categoryType=A`,
            token,
          );

          if (periodResponse.statusCode !== 200 || !periodResponse.result) {
            return res.status(500).json({
              status: false,
              result: null,
              error: { message: 'Error fetching period-summ data' },
            });
          }

          limit = periodResponse.result.map((item) => ({
            month: item.period,
            amount: item.value,
          }));
        }

        return res.status(200).json({
          status: true,
          result: { provider: response?.provider, limit },
          error: null,
        });
      } else if (app.state == 'failed' || app.status != 'scoring') {
        return res.status(400).json({
          status: false,
          error: {
            message: app.reason_error_davrbank || 'No limit available',
          },
          result: null,
        });
      } else {
        return res.status(202).json({
          status: true,
          result: { message: 'waiting' },
          error: null,
        });
      }
    } catch (error) {
      console.error('Error in getLimit:', error);
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'Unknown error occurred',
        },
      });
    }
  }

  // add product add + period + delete product
  async addProduct(data: CreateProductIcanDto, req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          error: { message: 'Authorization token is missing' },
          result: null,
        });
      }

      const app = await this.appGetOne(data.app_id);
      if (!app) {
        return res.status(404).json({
          status: false,
          error: { message: 'Application not found' },
          result: null,
        });
      }
      if (app.limit_amount <= 0 || app.limit_amount <= '0') {
        return res.status(400).json({
          status: false,
          error: { message: 'Клиенту не одобрен лимит на рассрочку' },
          result: null,
        });
      }

      // Ariza periodini yangilash
      await this.applicationRepo.update(
        { app_id: data.app_id },
        { period: data.period },
      );

      for (const product of data.products) {
        const body = {
          name: product.name,
          amount: String(product.amount),
          price: String(product.amount),
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

      // Arizani tasdiqlash
      const periodResponse = await this.apiService.postApiWithToken(
        `/application/approve/${data.app_id}`,
        token,
        { period: data.period },
      );

      if (periodResponse.statusCode === 400) {
        await this.deleteProductByAppId(data.app_id, req, res);
        return res.status(400).json({
          status: false,
          error: { message: periodResponse.message },
          result: {
            client_info: {
              name: app.name,
              surname: app.surname,
              fathers_name: app.fathers_name,
              owner_phone: app.owner_phone,
              close_phone: app.close_phone,
            },
          },
        });
      }

      // Ariza holatini olish
      const apiResponse = await this.apiService.getApi(
        `/application/get/status/${data.app_id}`,
        token,
      );
      const { b_state, b_status, is_anorbank_new_client } = apiResponse.result;

      // Bank holatini tekshirish (Izohga olingan kod)
      /*
      const error = await this.errorRepo.findOne({ where: { b_state, b_status } });
      if (error) {
        await this.deleteProductByAppId(data.app_id, req, res);
        return res.status(400).json({
          status: false,
          error: { message: error.description },
          result: null,
        });
      }
      */

      return res.status(200).json({
        status: true,
        result: {
          client_info: {
            name: app.name,
            surname: app.surname,
            fathers_name: app.fathers_name,
            owner_phone: app.owner_phone,
            close_phone: app.close_phone,
          },
          is_otp: is_anorbank_new_client === true,
        },
        error: null,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        result: {
          client_info: {
            name: data?.app_id
              ? (await this.appGetOne(data.app_id))?.name
              : null,
            surname: data?.app_id
              ? (await this.appGetOne(data.app_id))?.surname
              : null,
            fathers_name: data?.app_id
              ? (await this.appGetOne(data.app_id))?.fathers_name
              : null,
            owner_phone: data?.app_id
              ? (await this.appGetOne(data.app_id))?.owner_phone
              : null,
            close_phone: data?.app_id
              ? (await this.appGetOne(data.app_id))?.close_phone
              : null,
          },
        },
        error: { message: error.message || 'An unexpected error occurred' },
      });
    }
  }

  // get info
  async getById(app_id: string, req: Request, res: Response) {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({
        status: false,
        result: null,
        error: {
          message: 'Authorization token is missing',
        },
      });
    }

    const app = await this.appGetOne(app_id);
    if (!app) {
      return res.status(404).json({
        status: false,
        result: null,
        error: {
          message: 'Application not found',
        },
      });
    }

    try {
      const response = await this.apiService.getApi(
        `/application/get/${app_id}`,
        token,
      );

      if (!response.result) {
        return res.status(response.status).json({
          status: false,
          result: null,
          error: {
            message: response.error?.message || 'Unknown error in getApi',
          },
        });
      }

      const apiResponse = await this.apiService.getApi(
        `/application/get/status/${app_id}`,
        token,
      );

      if (!apiResponse.result) {
        return res.status(apiResponse.status).json({
          status: false,
          result: null,
          error: {
            message:
              apiResponse.error?.message || 'Unknown error in getApi (status)',
          },
        });
      }

      return res.status(200).json({
        status: true,
        result: {
          id: response.result.id,
          period: response.result.period,
          provider: response.result.provider,
          b_status: apiResponse.result.b_status,
          b_state: apiResponse.result.b_state,
          status: apiResponse.result.status,
          state: apiResponse.result.state,
          is_anorbank_new_client: apiResponse.result.is_anorbank_new_client,
          client_info: {
            name: response.result.user?.name,
            surname: response.result.user?.surname,
            fathers_name: response.result.user?.fathers_name,
            owner_phone: response.result.owner_phone,
            close_phone: response.result.close_phone,
          },
          merchant: {
            modelId: response.result.merchant?.id,
            name: response.result.merchant?.name,
          },
          products: response.result.products || [],
        },
        error: null,
      });
    } catch (error: any) {
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'Unknown error occurred',
        },
      });
    }
  }

  // verify otp
  async verifyOtp(data: VerifyNewClientDto, req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          result: null,
          error: {
            message: 'Authorization token is missing',
          },
        });
      }

      const app = await this.appGetOne(data.app_id);

      if (!app) {
        return res.status(404).json({
          status: false,
          result: null,
          error: {
            message: 'Application not found',
          },
        });
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
        return res
          .status(201)
          .json({ status: true, result: { message: 'success' }, error: null });
      }

      return res.status(response.statusCode || 400).json({
        status: false,
        result: null,
        error: {
          message: response.message || 'API request failed',
        },
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      });
    }
  }

  // get contract
  async getSchedule(app_id: string, req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          result: null,
          error: {
            message: 'Authorization token is missing',
          },
        });
      }

      const app = await this.appGetOne(app_id);
      if (!app) {
        return res.status(404).json({
          status: false,
          result: null,
          error: {
            message: 'Application not found',
          },
        });
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

      return res.status(200).json({
        status: true,
        result: {
          pdf_url: scheduleFileUrl,
          month: response?.result?.contract_period,
          client_full_name: response?.result?.client_full_name,
        },
        error: null,
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      });
    }
  }

  // delete product
  async deleteProductByAppId(app_id: string, req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          result: null,
          error: {
            message: 'Authorization token is missing',
          },
        });
      }

      const app = await this.appGetOne(app_id);
      if (!app) {
        return res.status(404).json({
          status: false,
          result: null,
          error: {
            message: 'Application not found',
          },
        });
      }

      const response = await this.apiService.deleteApiWithToken(
        `/products/application/${app_id}`,
        token,
      );

      if (response.statusCode === true) {
        return res.status(200).json({
          status: true,
          result: { message: 'success' },
          error: null,
        });
      }

      return res.status(response.statusCode || 400).json({
        status: false,
        result: null,
        error: {
          message: response.message || 'Failed to delete product',
        },
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      });
    }
  }

  // reject product
  async rejectApp(app_id: string, req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          result: null,
          error: {
            message: 'Authorization token is missing',
          },
        });
      }

      const app = await this.appGetOne(app_id);
      if (!app) {
        return res.status(404).json({
          status: false,
          result: null,
          error: {
            message: 'Application not found',
          },
        });
      }

      const response = await this.apiService.putApiWithToken(
        `/application/reject/${app_id}`,
        token,
        { reject_reason: 'Клиент отказался' },
      );

      if (response?.reason_of_reject === 'Клиент отказался') {
        return res.status(200).json({
          status: true,
          result: { message: 'success' },
          error: null,
        });
      }

      return res.status(response.statusCode || 400).json({
        status: false,
        result: null,
        error: {
          message: response?.message || 'Failed to reject application',
        },
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      });
    }
  }

  // resend otp
  async resendOtp(data: ResendOtpDto, req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          result: null,
          error: {
            message: 'Authorization token is missing',
          },
        });
      }

      const app = await this.appGetOne(data.app_id);

      if (!app) {
        return res.status(404).json({
          status: false,
          result: null,
          error: {
            message: 'Application not found',
          },
        });
      }
      let type = 'anor';
      const response = await this.apiService.getApi(
        `/application/resend/${data.app_id}?type=${type}`,
        token,
      );

      if (response.statusCode === 200) {
        return res
          .status(200)
          .json({ status: true, result: { message: 'success' }, error: null });
      }

      return res.status(response.statusCode || 400).json({
        status: false,
        result: null,
        error: {
          message: response.message || 'API request failed',
        },
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      });
    }
  }

  async calculatePerMonth(
    data: CalculatePerMonthDto,
    req: Request,
    res: Response,
  ) {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({
          status: false,
          result: null,
          error: {
            message: 'Authorization token is missing',
          },
        });
      }

      const body = {
        amount: data.amount,
      };

      const response = await this.apiService.postApiWithToken(
        '/handbook/period-rate/calculate',
        token,
        body,
      );
      const {result}=response
      if (response.statusCode === 201 && result?.result != null) {
        return res
          .status(200)
          .json({ status: true, result: result?.result, error: null });
      }

      return res.status(400).json({
        status: false,
        result: null,
        error: {
          message: result.message || 'API request failed',
        },
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        status: false,
        result: null,
        error: {
          message: error.message || 'An unexpected error occurred',
        },
      });
    }
  }
}
