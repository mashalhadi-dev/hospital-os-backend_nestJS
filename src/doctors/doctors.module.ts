import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { DoctorsController } from './doctors.controller.js';
import { DoctorsService } from './doctors.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
