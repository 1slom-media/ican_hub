import { Injectable } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ApiClientService {
  private readonly axiosInstance: AxiosInstance;
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.BACKEND_URL,
    });
  }

  async getApi(url: string, token: string) {
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    try {
      const response = await this.axiosInstance({
        method: 'get',
        url,
        headers: {
          Authorization: token,
        },
      });
      return response.data;
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Unknown error occurred';
      throw {
        status: statusCode,
        message: `API request failed: ${errorMessage}`,
      };
    }
  }

  async postApiWithToken(url: string, token: string, data: any) {
    if (!token.startsWith('Bearer ')) {
      token = `Bearer ${token}`;
    }
    console.log(data,'api data');
    try {
      const response = await this.axiosInstance({
        method: 'post',
        url,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        data,
      });
      console.log(response.data);
      return response.data;
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Unknown error occurred';
      throw {
        status: statusCode,
        message: `API request failed: ${errorMessage}`,
      };
    }
  }

  async postApi(url: string, data: any) {
    try {
      const response = await this.axiosInstance({
        method: 'post',
        url,
        headers: {
          'Content-Type': 'application/json',
        },
        data,
      });
      console.log(response.data);
      return response.data;
    } catch (error: any) {
      return error.response?.data;
    }
  }

  async putApiWithToken(url: string, token: string, data: any) {
    try {
      if (!token.startsWith('Bearer ')) {
        token = `Bearer ${token}`;
      }
      const response = await this.axiosInstance({
        method: 'put',
        url,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
        data,
      });

      return response.data;
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Unknown error occurred';
      throw {
        status: statusCode,
        message: `API request failed: ${errorMessage}`,
      };
    }
  }

  async deleteApiWithToken(url: string, token: string) {
    try {
      if (!token.startsWith('Bearer ')) {
        token = `Bearer ${token}`;
      }
      const response = await this.axiosInstance({
        method: 'delete',
        url,
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error: any) {
      const statusCode = error.response?.status || 500;
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Unknown error occurred';
      throw {
        status: statusCode,
        message: `API request failed: ${errorMessage}`,
      };
    }
  }
}
