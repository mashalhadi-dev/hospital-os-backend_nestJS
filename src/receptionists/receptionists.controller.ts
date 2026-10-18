import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  CreateReceptionistDto,
  UpdateReceptionistDto,
} from './dto/receptionist.dto.js';
import { ReceptionistsService } from './receptionists.service.js';

@Controller('receptionists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST)
export class ReceptionistsController {
  constructor(private readonly receptionistsService: ReceptionistsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateReceptionistDto) {
    return this.receptionistsService.create(dto);
  }

  @Get()
  findAll() {
    return this.receptionistsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.receptionistsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateReceptionistDto,
  ) {
    return this.receptionistsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.receptionistsService.remove(id);
  }
}
