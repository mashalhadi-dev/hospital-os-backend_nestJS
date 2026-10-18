import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CreateMedicationAdministrationDto } from './dto/create-medication-administration.dto.js';
import { CreateNurseDto, UpdateNurseDto } from './dto/nurse.dto.js';
import { CreateVitalSignDto } from './dto/create-vital-sign.dto.js';
import { NursesService } from './nurses.service.js';

@Controller('nurses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
export class NursesController {
  constructor(private readonly nursesService: NursesService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateNurseDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.nursesService.create(dto, request.user);
  }

  @Get()
  findAll() {
    return this.nursesService.findAll();
  }

  @Get('vitals')
  // DOCTOR: read-only vitals access for clinical review in the doctor workspace
  @Roles(Role.ADMIN, Role.NURSE, Role.DOCTOR)
  findVitals(
    @Query('patientId', new ParseUUIDPipe({ optional: true }))
    patientId?: string,
  ) {
    return this.nursesService.findVitals(patientId);
  }

  @Post('vitals')
  @Roles(Role.NURSE)
  createVitalSign(
    @Body() dto: CreateVitalSignDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.nursesService.createVitalSign(dto, request.user);
  }

  @Get('medication-orders')
  @Roles(Role.ADMIN, Role.NURSE)
  findMedicationOrders(
    @Query('patientId', new ParseUUIDPipe({ optional: true }))
    patientId?: string,
  ) {
    return this.nursesService.findMedicationOrders(patientId);
  }

  @Post('medication-administrations')
  @Roles(Role.NURSE)
  recordMedicationAdministration(
    @Body() dto: CreateMedicationAdministrationDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.nursesService.recordMedicationAdministration(
      dto,
      request.user,
    );
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.nursesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateNurseDto,
  ) {
    return this.nursesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.nursesService.remove(id);
  }
}
