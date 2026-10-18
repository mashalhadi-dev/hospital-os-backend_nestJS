import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterHospitalDto {
  @IsString() @MinLength(2) @MaxLength(140) name!: string;
  @IsString() @MinLength(2) @MaxLength(80) slug!: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsString() @MinLength(2) @MaxLength(100) ownerName!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(8) @MaxLength(72) password!: string;
}
