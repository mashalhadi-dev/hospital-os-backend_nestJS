// src/users/dto/login.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please enter a valid email' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}