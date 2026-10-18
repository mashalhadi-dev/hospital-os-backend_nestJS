import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextInterceptor } from './common/tenant-context.interceptor.js';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.validation.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AiModule } from './ai/ai.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { AuthModule } from './auth/auth.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { DoctorsModule } from './doctors/doctors.module.js';
import { PatientsModule } from './patients/patients.module.js';
import { BillingModule } from './billing/billing.module.js';
import { NursesModule } from './nurses/nurses.module.js';
import { ReceptionistsModule } from './receptionists/receptionists.module.js';
import { MedicinesModule } from './medicines/medicines.module.js';
import { HospitalsModule } from './hospitals/hospitals.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    AiModule,
    AuthModule,
    RedisModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    BillingModule,
    NursesModule,
    ReceptionistsModule,
    MedicinesModule,
    HospitalsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor }],
})
export class AppModule {}
