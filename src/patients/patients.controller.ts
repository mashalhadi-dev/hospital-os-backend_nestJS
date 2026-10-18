import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { Prisma } from '@prisma/client';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientsService } from './patients.service.js';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.PATIENT)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.RECEPTIONIST)
  create(
    @Body() dto: CreatePatientDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ): Promise<Prisma.PatientGetPayload<object>> {
    return this.patientsService.create(dto, request.user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
  findAll(
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.patientsService.findAll(request.user);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.patientsService.findOne(id, request.user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePatientDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ): Promise<Prisma.PatientGetPayload<object>> {
    return this.patientsService.update(id, dto, request.user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<Prisma.PatientGetPayload<object>> {
    return this.patientsService.remove(id);
  }
}
