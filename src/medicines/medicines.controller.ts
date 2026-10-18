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
import { CreateMedicineDto, UpdateMedicineDto } from './dto/medicine.dto.js';
import { CreatePrescriptionDto } from './dto/prescription.dto.js';
import { UpdatePrescriptionDto } from './dto/prescription.dto.js';
import { MedicinesService } from './medicines.service.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicinesController {
  constructor(private readonly medicinesService: MedicinesService) {}

  @Post('medicines')
  @Roles(Role.ADMIN, Role.RECEPTIONIST, Role.NURSE)
  createMedicine(@Body() dto: CreateMedicineDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.medicinesService.create(dto, request.user);
  }

  @Get('medicines')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
  findMedicines() {
    return this.medicinesService.findAll();
  }

  @Get('medicines/:id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
  findMedicine(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.medicinesService.findOne(id);
  }

  @Patch('medicines/:id')
  @Roles(Role.ADMIN, Role.NURSE)
  updateMedicine(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateMedicineDto,
  ) {
    return this.medicinesService.update(id, dto);
  }

  @Delete('medicines/:id')
  @Roles(Role.ADMIN)
  removeMedicine(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.medicinesService.remove(id);
  }

  @Post('prescriptions')
  @Roles(Role.DOCTOR)
  createPrescription(
    @Body() dto: CreatePrescriptionDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.medicinesService.createPrescription(dto, request.user);
  }

  @Get('prescriptions')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  findPrescriptions(
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.medicinesService.findPrescriptions(request.user);
  }

  @Patch('prescriptions/:id')
  @Roles(Role.DOCTOR)
  updatePrescription(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePrescriptionDto,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.medicinesService.updatePrescription(id, dto, request.user);
  }

  @Delete('prescriptions/:id')
  @Roles(Role.DOCTOR)
  removePrescription(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request & { user: AuthenticatedUser },
  ) {
    return this.medicinesService.removePrescription(id, request.user);
  }
}
