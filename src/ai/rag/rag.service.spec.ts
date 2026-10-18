import { ForbiddenException } from '@nestjs/common';
import { Gender, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/guards/jwt-auth.guard.js';
import { RagService } from './rag.service.js';

const patientId = '2bbfdc6a-1f85-4c25-8a1a-5df94bef5a72';
const nurseId = '29a38de4-6c0e-4cf5-a1de-a3f1ec84f4bc';
const nurse: AuthenticatedUser = { id: nurseId, role: Role.NURSE };

describe('RagService nursing context', () => {
  it('returns only the nurse-scoped care context after a documented care event', async () => {
    const prisma = {
      nurse: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-profile' }) },
      patient: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ id: patientId })
          .mockResolvedValueOnce({
            age: 35,
            gender: Gender.MALE,
            prescriptions: [],
          }),
      },
      vitalSign: {
        findFirst: vi.fn().mockResolvedValue({ id: 'vital-record' }),
        findMany: vi.fn().mockResolvedValue([{ heartRate: 72 }]),
      },
      medicationAdministration: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const service = new RagService(prisma as never);

    const context = await service.retrieveNursePatientContext(patientId, nurse);

    expect(context).toEqual({
      age: 35,
      gender: Gender.MALE,
      prescriptions: [],
      vitalSigns: [{ heartRate: 72 }],
      medicationAdministrations: [],
    });
    expect(context).not.toHaveProperty('medicalHistory');
    expect(context).not.toHaveProperty('name');
  });

  it('denies access when the nurse has not documented care for the patient', async () => {
    const prisma = {
      nurse: { findUnique: vi.fn().mockResolvedValue({ id: 'nurse-profile' }) },
      patient: { findUnique: vi.fn().mockResolvedValue({ id: patientId }) },
      vitalSign: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn(),
      },
      medicationAdministration: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn(),
      },
    };
    const service = new RagService(prisma as never);

    await expect(
      service.retrieveNursePatientContext(patientId, nurse),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.patient.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.vitalSign.findMany).not.toHaveBeenCalled();
  });

  it('does not allow non-nurses through the nursing context service', async () => {
    const prisma = {
      nurse: { findUnique: vi.fn() },
      patient: { findUnique: vi.fn() },
      vitalSign: { findFirst: vi.fn(), findMany: vi.fn() },
      medicationAdministration: { findFirst: vi.fn(), findMany: vi.fn() },
    };
    const service = new RagService(prisma as never);

    await expect(
      service.retrieveNursePatientContext(patientId, {
        id: nurseId,
        role: Role.DOCTOR,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.nurse.findUnique).not.toHaveBeenCalled();
  });
});
