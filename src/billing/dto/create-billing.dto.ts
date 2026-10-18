import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingStatus } from '@prisma/client';

export class CreateBillingItemDto {
  @IsOptional()
  @IsUUID()
  medicineId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  quantity!: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000000)
  unitPrice?: number;
}

export class CreateBillingDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000000)
  paidAmount?: number;

  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateBillingItemDto)
  items!: CreateBillingItemDto[];
}

export class UpdateBillingDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000000)
  paidAmount?: number;

  @IsOptional()
  @IsEnum(BillingStatus)
  status?: BillingStatus;
}
