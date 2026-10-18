import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { RagService } from './rag/rag.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [AiController],
  providers: [AiService, RagService],
  exports: [AiService],
})
export class AiModule {}
