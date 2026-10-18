import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator.js';
import { AskAiDto } from './dto/ask-ai.dto.js';
import { AskReceptionistAiDto } from './dto/ask-receptionist-ai.dto.js';
import { AiService } from './ai.service.js';
import {
  JwtAuthGuard,
  type AuthenticatedUser,
} from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('summarize')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  summarize(
    @Body() dto: AskAiDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ patientId: string; summary: string }> {
    return this.aiService.summarizeMedicalHistory(
      dto.patientId,
      request.user,
      dto.prompt,
    );
  }

  @Post('clinical-draft')
  @Roles(Role.ADMIN, Role.DOCTOR)
  draftClinicalNote(
    @Body() dto: AskAiDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ patientId: string; draft: string }> {
    return this.aiService.draftClinicalNote(
      dto.patientId,
      request.user,
      dto.prompt,
    );
  }

  @Post('copilot')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.PATIENT)
  copilot(
    @Body() dto: AskAiDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ patientId: string; response: string }> {
    return this.aiService.askCopilot(
      dto.patientId,
      request.user,
      dto.prompt ?? '',
    );
  }

  @Post('nurse-copilot')
  @Roles(Role.NURSE)
  nurseCopilot(
    @Body() dto: AskAiDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ patientId: string; response: string }> {
    return this.aiService.askNurseCopilot(
      dto.patientId,
      request.user,
      dto.prompt ?? '',
    );
  }

  @Post('receptionist-copilot')
  @Roles(Role.RECEPTIONIST)
  receptionistCopilot(
    @Body() dto: AskReceptionistAiDto,
  ): Promise<{ task: string; response: string }> {
    return this.aiService.createReceptionistSupport(dto.task);
  }
}
