import { Gender, Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @MaxLength(20)
  phone?: string;

  @IsEnum(Role)
  role: Role = Role.PATIENT;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.DOCTOR)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  specialization?: string;

  @ValidateIf(
    (dto: RegisterDto) =>
      dto.role === Role.DOCTOR || dto.role === Role.NURSE,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  department?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.NURSE)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  shift?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.PATIENT)
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.PATIENT)
  @IsEnum(Gender)
  gender?: Gender;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.RECEPTIONIST)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  deskNumber?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.PATIENT)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ValidateIf((dto: RegisterDto) => dto.role === Role.PATIENT)
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  registrationSecret?: string;

  @IsString()
  @MinLength(1)
  hospitalId!: string;
}
