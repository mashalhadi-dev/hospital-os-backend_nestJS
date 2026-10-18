import {
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';

const patientListSelect = {
  id: true,
  name: true,
  age: true,
  gender: true,
  phone: true,
  address: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PatientSelect;

type PatientListItem = Prisma.PatientGetPayload<{
  select: typeof patientListSelect;
}>;

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(
    dto: CreatePatientDto,
    requester: AuthenticatedUser,
  ): Promise<Prisma.PatientGetPayload<object>> {
    if (
      requester.role === Role.RECEPTIONIST &&
      dto.medicalHistory !== undefined
    ) {
      throw new ForbiddenException(
        'Receptionists may not create or update clinical history',
      );
    }
    if (requester.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      if (!doctor) {
        throw new ForbiddenException('No doctor profile is linked to this account');
      }
    }
    return this.prisma.patient.create({
      data: {
        hospitalId: requester.hospitalId,
        name: dto.name.trim(),
        age: dto.age,
        gender: dto.gender,
        phone: dto.phone.trim(),
        address: dto.address,
        medicalHistory: dto.medicalHistory,
      },
    });
  }

  findAll(requester: AuthenticatedUser): Promise<PatientListItem[]> {
    const where: Prisma.PatientWhereInput =
      requester.role === Role.DOCTOR
        ? {
            OR: [
              { appointments: { some: { doctor: { userId: requester.id } } } },
              { prescriptions: { some: { doctor: { userId: requester.id } } } },
            ],
          }
        : {};
    return this.prisma.patient.findMany({
      where,
      select: patientListSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<Prisma.PatientGetPayload<object>> {
    const patient = await this.prisma.patient.findUnique({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Patient with id "${id}" was not found`);
    }
    if (
      requester.role === Role.PATIENT &&
      patient.userId !== requester.id
    ) {
      throw new ForbiddenException('You may only access your own patient profile');
    }
    if (requester.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      const appointment = doctor
        ? await this.prisma.appointment.findFirst({
            where: { patientId: id, doctorId: doctor.id },
            select: { id: true },
          })
        : null;
      const prescription = doctor
        ? await this.prisma.prescription.findFirst({
            where: { patientId: id, doctorId: doctor.id },
            select: { id: true },
          })
        : null;
      if (!appointment && !prescription) {
        throw new ForbiddenException('You are not assigned to this patient');
      }
    }
    return patient;
  }

  async update(
    id: string,
    dto: UpdatePatientDto,
    requester: AuthenticatedUser,
  ): Promise<Prisma.PatientGetPayload<object>> {
    if (requester.role === Role.PATIENT) {
      if (dto.medicalHistory !== undefined) {
        throw new ForbiddenException(
          'Only authorized clinical staff may update medical history',
        );
      }
      const patient = await this.prisma.patient.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!patient) {
        throw new NotFoundException(`Patient with id "${id}" was not found`);
      }
      if (patient.userId !== requester.id) {
        throw new ForbiddenException('You may only update your own patient profile');
      }
    }
    if (requester.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      const careRelationship = doctor
        ? await this.prisma.appointment.findFirst({
            where: { doctorId: doctor.id, patientId: id },
            select: { id: true },
          })
        : null;
      const prescription = doctor
        ? await this.prisma.prescription.findFirst({
            where: { doctorId: doctor.id, patientId: id },
            select: { id: true },
          })
        : null;
      if (!careRelationship && !prescription) {
        throw new ForbiddenException('You are not assigned to this patient');
      }
    }
    try {
      return await this.prisma.patient.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          age: dto.age,
          gender: dto.gender,
          phone: dto.phone?.trim(),
          address: dto.address,
          medicalHistory: dto.medicalHistory,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Patient with id "${id}" was not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Prisma.PatientGetPayload<object>> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: {
        id: true,
        hospitalId: true,
        userId: true,
        name: true,
        age: true,
        gender: true,
        phone: true,
        address: true,
        medicalHistory: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            appointments: true,
            prescriptions: true,
            billings: true,
            vitalSigns: true,
          },
        },
      },
    });
    if (!patient) {
      throw new NotFoundException(`Patient with id "${id}" was not found`);
    }
    const { _count: patientCounts, ...patientRecord } = patient;
    if (
      patientCounts.appointments ||
      patientCounts.prescriptions ||
      patientCounts.billings ||
      patientCounts.vitalSigns
    ) {
      throw new ConflictException(
        'Patient records with clinical or billing history cannot be deleted',
      );
    }
    if (patient.userId) {
      await this.prisma.user.delete({ where: { id: patient.userId } });
      return patientRecord;
    }
    try {
      return await this.prisma.patient.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Patient with id "${id}" was not found`);
      }
      throw error;
    }
  }
}
