import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { NursesController } from './nurses.controller.js';
import { NursesService } from './nurses.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NursesController],
  providers: [NursesService],
})
export class NursesModule {}
