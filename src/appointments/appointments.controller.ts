import {
  Body,
  Controller,
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
import {
  AppointmentsService,
  type AppointmentResult,
} from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.PATIENT)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(
    @Body() dto: CreateAppointmentDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ): Promise<AppointmentResult> {
    return this.appointmentsService.create(dto, request.user);
  }

  @Get()
  findAll(
    @Req() request: Request & { user: AuthenticatedUser },
  ): Promise<AppointmentResult[]> {
    return this.appointmentsService.findAll(request.user);
  }

  @Get('doctors/:doctorId/queue')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.PATIENT)
  getDoctorQueue(
    @Param('doctorId', new ParseUUIDPipe()) doctorId: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ): Promise<AppointmentResult[]> {
    return this.appointmentsService.getDoctorQueue(doctorId, request.user);
  }

  @Get(':id')
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ): Promise<AppointmentResult> {
    return this.appointmentsService.findOne(id, request.user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST, Role.PATIENT)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ): Promise<AppointmentResult> {
    return this.appointmentsService.updateStatus(id, dto, request.user);
  }
}
