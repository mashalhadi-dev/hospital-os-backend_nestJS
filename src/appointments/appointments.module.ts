import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsGateway } from './appointments.gateway.js';
import { AppointmentsService } from './appointments.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsGateway, AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
