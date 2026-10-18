import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';
import { CreateMedicationAdministrationDto } from './dto/create-medication-administration.dto.js';
import { CreateNurseDto, UpdateNurseDto } from './dto/nurse.dto.js';
import { CreateVitalSignDto } from './dto/create-vital-sign.dto.js';

const nurseSelect = {
  id: true,
  userId: true,
  department: true,
  shift: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.NurseSelect;

@Injectable()
export class NursesService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(dto: CreateNurseDto, requester: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { role: true },
    });
    if (!user || user.role !== Role.NURSE) {
      throw new NotFoundException('A nurse user account was not found');
    }
    try {
      return await this.prisma.nurse.create({
        data: {
          hospitalId: requester.hospitalId,
          userId: dto.userId,
          department: dto.department.trim(),
          shift: dto.shift?.trim() || null,
        },
        select: nurseSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A nurse profile already exists for this user');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.nurse.findMany({
      select: nurseSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findVitals(patientId?: string) {
    if (patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: patientId },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException(`Patient with id "${patientId}" was not found`);
      }
    }
    return this.prisma.vitalSign.findMany({
      where: patientId ? { patientId } : undefined,
      select: {
        id: true,
        patientId: true,
        nurseUserId: true,
        systolicBloodPressure: true,
        diastolicBloodPressure: true,
        oxygenSaturation: true,
        heartRate: true,
        temperatureCelsius: true,
        bloodGlucoseMgDl: true,
        recordedAt: true,
        patient: { select: { id: true, name: true } },
        nurse: { select: { id: true, name: true } },
      },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
  }

  async createVitalSign(
    dto: CreateVitalSignDto,
    requester: AuthenticatedUser,
  ) {
    await this.assertNurse(requester.id);
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with id "${dto.patientId}" was not found`);
    }
    return this.prisma.vitalSign.create({
      data: {
        patientId: dto.patientId,
        nurseUserId: requester.id,
        systolicBloodPressure: dto.systolicBloodPressure,
        diastolicBloodPressure: dto.diastolicBloodPressure,
        oxygenSaturation: dto.oxygenSaturation,
        heartRate: dto.heartRate,
        temperatureCelsius: dto.temperatureCelsius,
        bloodGlucoseMgDl: dto.bloodGlucoseMgDl,
      },
      select: {
        id: true,
        patientId: true,
        nurseUserId: true,
        systolicBloodPressure: true,
        diastolicBloodPressure: true,
        oxygenSaturation: true,
        heartRate: true,
        temperatureCelsius: true,
        bloodGlucoseMgDl: true,
        recordedAt: true,
        patient: { select: { id: true, name: true } },
        nurse: { select: { id: true, name: true } },
      },
    });
  }

  findMedicationOrders(patientId?: string) {
    return this.prisma.prescription.findMany({
      where: patientId ? { patientId } : undefined,
      select: {
        id: true,
        patientId: true,
        diagnosis: true,
        instructions: true,
        createdAt: true,
        patient: { select: { id: true, name: true } },
        doctor: { select: { user: { select: { name: true } } } },
        items: {
          select: {
            id: true,
            dosage: true,
            quantity: true,
            medicine: { select: { id: true, name: true } },
            administrations: {
              select: {
                id: true,
                prescriptionItemId: true,
                nurseUserId: true,
                notes: true,
                administeredAt: true,
                nurse: { select: { name: true } },
              },
              orderBy: { administeredAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async recordMedicationAdministration(
    dto: CreateMedicationAdministrationDto,
    requester: AuthenticatedUser,
  ) {
    await this.assertNurse(requester.id);
    const prescriptionItem = await this.prisma.prescriptionItem.findUnique({
      where: { id: dto.prescriptionItemId },
      select: { id: true },
    });
    if (!prescriptionItem) {
      throw new NotFoundException(
        `Prescription item with id "${dto.prescriptionItemId}" was not found`,
      );
    }
    return this.prisma.medicationAdministration.create({
      data: {
        prescriptionItemId: dto.prescriptionItemId,
        nurseUserId: requester.id,
        notes: dto.notes?.trim() || null,
      },
      select: {
        id: true,
        prescriptionItemId: true,
        nurseUserId: true,
        notes: true,
        administeredAt: true,
      },
    });
  }

  async findOne(id: string) {
    const nurse = await this.prisma.nurse.findUnique({
      where: { id },
      select: nurseSelect,
    });
    if (!nurse) {
      throw new NotFoundException(`Nurse with id "${id}" was not found`);
    }
    return nurse;
  }

  async update(id: string, dto: UpdateNurseDto) {
    try {
      return await this.prisma.nurse.update({
        where: { id },
        data: {
          department: dto.department?.trim(),
          shift: dto.shift === undefined ? undefined : dto.shift?.trim() || null,
        },
        select: nurseSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Nurse with id "${id}" was not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    const nurse = await this.findOne(id);
    const auditRecords = await this.prisma.user.findUnique({
      where: { id: nurse.userId },
      select: {
        _count: {
          select: {
            recordedVitals: true,
            medicationAdministrations: true,
          },
        },
      },
    });
    if (
      auditRecords &&
      (auditRecords._count.recordedVitals > 0 ||
        auditRecords._count.medicationAdministrations > 0)
    ) {
      throw new ConflictException(
        'A nurse with clinical audit records cannot be deleted',
      );
    }
    try {
      await this.prisma.user.delete({ where: { id: nurse.userId } });
      return nurse;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Nurse with id "${id}" was not found`);
      }
      throw error;
    }
  }

  private async assertNurse(userId: string): Promise<void> {
    const nurse = await this.prisma.nurse.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!nurse) {
      throw new ForbiddenException('A nurse profile is required for this action');
    }
  }
}
