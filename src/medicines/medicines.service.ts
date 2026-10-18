import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';
import { CreateMedicineDto, UpdateMedicineDto } from './dto/medicine.dto.js';
import {
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
} from './dto/prescription.dto.js';

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaClient) {}

  create(dto: CreateMedicineDto, requester: AuthenticatedUser) {
    return this.prisma.medicine
      .create({
        data: {
          hospitalId: requester.hospitalId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          price: dto.price,
          stock: dto.stock ?? 0,
        },
      })
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('A medicine with this name already exists');
        }
        throw error;
      });
  }

  findAll() {
    return this.prisma.medicine.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const medicine = await this.prisma.medicine.findUnique({ where: { id } });
    if (!medicine) {
      throw new NotFoundException(`Medicine with id "${id}" was not found`);
    }
    return medicine;
  }

  async update(id: string, dto: UpdateMedicineDto) {
    try {
      return await this.prisma.medicine.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : dto.description?.trim() || null,
          price: dto.price,
          stock: dto.stock,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Medicine with id "${id}" was not found`);
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A medicine with this name already exists');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      select: {
        id: true,
        _count: { select: { prescriptionItems: true } },
      },
    });
    if (!medicine) {
      throw new NotFoundException(`Medicine with id "${id}" was not found`);
    }
    if (medicine._count.prescriptionItems > 0) {
      throw new ConflictException(
        'A medicine referenced by a prescription cannot be deleted',
      );
    }
    return this.prisma.medicine.delete({ where: { id } });
  }

  async createPrescription(
    dto: CreatePrescriptionDto,
    requester: AuthenticatedUser,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: requester.id },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('A doctor profile was not found');
    }
    const doctorId = doctor?.id;
    if (!doctorId) {
      throw new NotFoundException('A doctor profile was not found');
    }
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(
        `Patient with id "${dto.patientId}" was not found`,
      );
    }
    const appointment = await this.prisma.appointment.findFirst({
      where: { patientId: dto.patientId, doctorId },
      select: { id: true },
    });
    if (!appointment) {
      throw new ConflictException(
        'A prescription requires an appointment between this doctor and patient',
      );
    }
    return this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        doctorId,
        diagnosis: dto.diagnosis.trim(),
        instructions: dto.instructions?.trim() || null,
        items: {
          create: dto.items.map((item) => ({
            medicineId: item.medicineId,
            dosage: item.dosage.trim(),
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { medicine: true } },
      },
    });
  }

  findPrescriptions(requester: AuthenticatedUser) {
    return this.prisma.prescription.findMany({
      where:
        requester.role === Role.DOCTOR
          ? { doctor: { userId: requester.id } }
          : requester.role === Role.PATIENT
            ? { patient: { userId: requester.id } }
            : undefined,
      include: {
        items: { include: { medicine: true } },
        patient: { select: { id: true, name: true } },
        doctor: { select: { id: true, user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePrescription(
    id: string,
    dto: UpdatePrescriptionDto,
    requester: AuthenticatedUser,
  ) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: requester.id },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('A doctor profile was not found');
    }
    const current = await this.prisma.prescription.findFirst({
      where: { id, doctorId: doctor.id },
      select: { id: true },
    });
    if (!current) {
      throw new NotFoundException(`Prescription with id "${id}" was not found`);
    }
    if (dto.items) {
      const administeredItem = await this.prisma.prescriptionItem.findFirst({
        where: {
          prescriptionId: id,
          administrations: { some: {} },
        },
        select: { id: true },
      });
      if (administeredItem) {
        throw new ConflictException(
          'Prescription items with medication administration history cannot be replaced',
        );
      }
    }
    return this.prisma.prescription.update({
      where: { id },
      data: {
        diagnosis: dto.diagnosis?.trim(),
        instructions:
          dto.instructions === undefined
            ? undefined
            : dto.instructions?.trim() || null,
        ...(dto.items
          ? {
              items: {
                deleteMany: {},
                create: dto.items.map((item) => ({
                  medicineId: item.medicineId,
                  dosage: item.dosage.trim(),
                  quantity: item.quantity,
                })),
              },
            }
          : {}),
      },
      include: { items: { include: { medicine: true } } },
    });
  }

  async removePrescription(id: string, requester: AuthenticatedUser) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: requester.id },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('A doctor profile was not found');
    }
    const administeredItem = await this.prisma.prescriptionItem.findFirst({
      where: {
        prescriptionId: id,
        prescription: { doctorId: doctor.id },
        administrations: { some: {} },
      },
      select: { id: true },
    });
    if (administeredItem) {
      throw new ConflictException(
        'A prescription with medication administration history cannot be deleted',
      );
    }
    const result = await this.prisma.prescription.deleteMany({
      where: { id, doctorId: doctor.id },
    });
    if (!result.count) {
      throw new NotFoundException(`Prescription with id "${id}" was not found`);
    }
    return { id };
  }
}
