import { Module } from '@nestjs/common';
import { HospitalsController } from './hospitals.controller.js';
import { HospitalsService } from './hospitals.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({ imports: [AuthModule], controllers: [HospitalsController], providers: [HospitalsService] })
export class HospitalsModule {}
