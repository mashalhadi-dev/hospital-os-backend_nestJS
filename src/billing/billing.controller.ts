import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { CreateBillingDto, UpdateBillingDto } from './dto/create-billing.dto.js';
import { BillingService } from './billing.service.js';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.RECEPTIONIST)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @Roles(Role.ADMIN, Role.RECEPTIONIST)
  create(@Body() dto: CreateBillingDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.billingService.create(dto, request.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT)
  findAll(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.billingService.findAll(request.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.PATIENT)
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.billingService.findOne(id, request.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.RECEPTIONIST)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBillingDto,
  ) {
    return this.billingService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.RECEPTIONIST)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.billingService.remove(id);
  }
}
