import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { PatientsController } from './patients.controller.js';
import { PatientsService } from './patients.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
