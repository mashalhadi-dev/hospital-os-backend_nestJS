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

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/\S/)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  @Matches(/\S/)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  medicalHistory?: string | null;
}
