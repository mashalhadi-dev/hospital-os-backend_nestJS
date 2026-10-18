import {
  Global,
  Injectable,
  Module,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantRequestContext } from './tenant-context.js';

const tenantModels = new Set([
  'User', 'Patient', 'Doctor', 'Nurse', 'Appointment', 'Billing', 'Medicine',
]);
const relationalTenantPaths: Record<string, string[][]> = {
  Prescription: [['patient']],
  PrescriptionItem: [['prescription', 'patient']],
  VitalSign: [['patient']],
  BillingItem: [['billing']],
  MedicationAdministration: [['nurse'], ['prescriptionItem', 'prescription', 'patient']],
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
    this.$use(async (params, next) => {
      const hospitalId = tenantRequestContext.getStore()?.hospitalId;
      if (!hospitalId || !params.model || (!tenantModels.has(params.model) && !relationalTenantPaths[params.model])) {
        return next(params);
      }
      const args = (params.args ??= {}) as Record<string, any>;
      if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy', 'update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
        if (tenantModels.has(params.model)) {
          args.where = { ...args.where, hospitalId };
        } else {
          const where = { ...args.where };
          for (const path of relationalTenantPaths[params.model] ?? []) {
            let cursor = where as Record<string, any>;
            for (const segment of path) cursor = (cursor[segment] ??= {});
            cursor.hospitalId = hospitalId;
          }
          args.where = where;
        }
      }
      if (params.action === 'create' && tenantModels.has(params.model)) {
        args.data = { ...args.data, hospitalId };
        for (const relation of ['doctorProfile', 'nurseProfile', 'patientProfile']) {
          const nested = args.data[relation]?.create;
          if (nested) args.data[relation].create = { ...nested, hospitalId };
        }
      }
      if (params.action === 'createMany' && tenantModels.has(params.model)) {
        args.data = Array.isArray(args.data)
          ? args.data.map((row: object) => ({ ...row, hospitalId }))
          : { ...args.data, hospitalId };
      }
      if (params.action === 'upsert' && tenantModels.has(params.model)) {
        args.where = { ...args.where, hospitalId };
        args.create = { ...args.create, hospitalId };
        args.update = { ...args.update, hospitalId };
      }
      return next(params);
    });
  }

  onModuleInit(): Promise<void> {
    return this.$connect();
  }

  onModuleDestroy(): Promise<void> {
    return this.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    PrismaService,
    { provide: PrismaClient, useExisting: PrismaService },
  ],
  exports: [PrismaClient, PrismaService],
})
export class PrismaModule {}
