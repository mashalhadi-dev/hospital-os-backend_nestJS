import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PrescriptionItemDto {
  @IsUUID()
  medicineId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  dosage!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreatePrescriptionDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  diagnosis!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items!: PrescriptionItemDto[];
}

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items?: PrescriptionItemDto[];
}
