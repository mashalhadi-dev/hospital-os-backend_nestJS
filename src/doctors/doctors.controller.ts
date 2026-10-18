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
  UseGuards,
  Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard, type AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import { DoctorsService } from './doctors.service.js';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateDoctorDto, @Req() request: Request & { user: AuthenticatedUser }) {
    return this.doctorsService.create(dto, request.user);
  }

  @Get()
  findAll() {
    return this.doctorsService.findAll();
  }

  @Get('availability')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.PATIENT)
  findBookableDoctors() {
    return this.doctorsService.findBookableDoctors();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.doctorsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateDoctorDto,
  ) {
    return this.doctorsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.doctorsService.remove(id);
  }
}
