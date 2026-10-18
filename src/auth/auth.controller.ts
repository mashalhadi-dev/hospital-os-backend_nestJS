import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  AuthService,
  type AuthLoginResponse,
} from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto): Promise<AuthLoginResponse> {
    return this.authService.register(dto);
  }

  @Post('staff')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  registerStaff(
    @Body() dto: RegisterDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<AuthLoginResponse> {
    return this.authService.registerStaffForHospital(dto, request.user);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthLoginResponse> {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  currentUser(
    @Req() request: AuthenticatedRequest,
  ): ReturnType<AuthService['getCurrentUser']> {
    return this.authService.getCurrentUser(request.user.id);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  listUsers(): ReturnType<AuthService['listUsers']> {
    return this.authService.listUsers();
  }
}
