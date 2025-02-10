import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AddPeriodDto,
  AddProductDto,
  GetLimitDto,
  VerifyNewClientDto,
} from './dto/application.dto';
import { ApplicationService } from './application.service';
import { Request, Response } from 'express';

@ApiBearerAuth()
@ApiTags('Ican')
@Controller('application')
export class ApplicationController {
  constructor(public applicationService: ApplicationService) {}

  @ApiOperation({ summary: 'Ican get limit' })
  @Post('/broker/get-limit')
  async getLimit(@Body() data: GetLimitDto, @Req() req: Request) {
    return this.applicationService.getLimit(data, req);
  }

  @ApiOperation({ summary: 'Ican add product' })
  @Post('/broker/add-product')
  async addProduct(@Body() data: AddProductDto, @Req() req: Request) {
    return this.applicationService.addProduct(data, req);
  }

  @ApiOperation({ summary: 'Ican add period' })
  @Post('/broker/add-period')
  async getStatus(@Body() data: AddPeriodDto, @Req() req: Request) {
    return this.applicationService.getStatus(data, req);
  }

  @ApiOperation({ summary: 'Ican verify contract otp if new_client true' })
  @Post('/broker/confirm-contract-otp')
  async verifyOtp(@Body() data: VerifyNewClientDto, @Req() req: Request) {
    return this.applicationService.verifyOtp(data, req);
  }

  @ApiOperation({ summary: 'Ican get schedule' })
  @Get('/broker/get-contract/:id')
  async getContract(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.applicationService.getSchedule(id, req, res);
  }

  @ApiOperation({ summary: 'Ican get one' })
  @Get('/broker/get/:id')
  async getOne(@Param('id') id: string, @Req() req: Request) {
    return this.applicationService.getById(id, req);
  }

  @ApiOperation({ summary: 'Ican delete product by Id' })
  @Delete('/broker/delete-product/:id')
  async deleteProduct(@Param('id') id: string, @Req() req: Request) {
    return this.applicationService.deleteProductByAppId(id, req);
  }

  @ApiOperation({ summary: 'Ican reject application' })
  @Delete('/broker/reject/:id')
  async rejected(@Param('id') id: string, @Req() req: Request) {
    return this.applicationService.rejectApp(id, req);
  }
}
