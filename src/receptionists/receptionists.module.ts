import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { ReceptionistsController } from './receptionists.controller.js';
import { ReceptionistsService } from './receptionists.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReceptionistsController],
  providers: [ReceptionistsService],
})
export class ReceptionistsModule {}
