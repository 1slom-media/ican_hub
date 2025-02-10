import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class IcanLoginAuthDto {
  @ApiProperty({ example: 'ican-admin' })
  @IsString()
  username: string;

  @ApiProperty({ example: '123456789' })
  @IsString()
  password: string;
}

export class IcanBrokerAuthDto {
  @ApiProperty({ example: 'key' })
  @IsString()
  broker_key: string;
}
