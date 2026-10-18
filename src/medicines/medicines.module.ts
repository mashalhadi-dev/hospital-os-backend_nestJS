import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../common/prisma.module.js';
import { MedicinesController } from './medicines.controller.js';
import { MedicinesService } from './medicines.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MedicinesController],
  providers: [MedicinesService],
})
export class MedicinesModule {}
