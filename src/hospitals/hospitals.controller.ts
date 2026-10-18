import { Body, Controller, Get, Post } from '@nestjs/common';
import { HospitalsService } from './hospitals.service.js';
import { RegisterHospitalDto } from './dto/register-hospital.dto.js';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitals: HospitalsService) {}
  @Get() list() { return this.hospitals.list(); }
  @Post('register') register(@Body() dto: RegisterHospitalDto) { return this.hospitals.register(dto); }
}
