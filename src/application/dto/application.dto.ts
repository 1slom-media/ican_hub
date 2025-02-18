import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class GetLimitDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'Merchant ID' })
  @IsString()
  merchant_id: string;
}

export class VerifyNewClientDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'Otp', example: '123456' })
  @IsString()
  otp: string;
}

export class AddPeriodDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'month period' })
  @IsString()
  period: string;
}

export class CreateProductIcanDto {
  @ApiProperty({ description: 'Application ID' })
  @IsString()
  app_id: string;

  @ApiProperty({ description: 'Month' })
  @IsString()
  period: string;

  @ApiProperty({
    description: 'Products array',
    isArray: true,
    type: () => ProductDto,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductDto)
  products: ProductDto[];
}

export class ProductDto {
  @ApiProperty({ description: 'Product name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Product amount' })
  @IsString()
  amount: string;

  @IsOptional()
  @IsString()
  product_id: string;
}
