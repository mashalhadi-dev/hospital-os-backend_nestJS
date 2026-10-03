import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { PatientsModule } from './patients/patients.module.js'; // <-- 1. Yeh import yahan add karo

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'hospital-os-backend',
    }),
    PrismaModule,
    UsersModule,
    PatientsModule, // <-- 2. Yeh yahan imports array mein add karo
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}