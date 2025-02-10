import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetLimitDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'Merchant ID' })
  @IsString()
  merchant_id: string;
}

export class AddProductDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'product amount' })
  @IsString()
  amount: string;

  @ApiProperty({ description: 'product name' })
  @IsString()
  name: string;
}

export class AddPeriodDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'month period' })
  @IsString()
  period: string;
}

export class VerifyNewClientDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'Otp', example: '123456' })
  @IsString()
  otp: string;
}
