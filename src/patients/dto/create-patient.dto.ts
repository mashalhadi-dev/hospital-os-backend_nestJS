import { Gender } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
} from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  name!: string;

  @IsInt()
  @Min(0)
  @Max(130)
  age!: number;

  @IsEnum(Gender)
  gender!: Gender;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/\S/)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  medicalHistory?: string;
}
