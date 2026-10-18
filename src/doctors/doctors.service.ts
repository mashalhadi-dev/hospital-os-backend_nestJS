import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import { CreateDoctorDto } from './dto/create-doctor.dto.js';
import { UpdateDoctorDto } from './dto/update-doctor.dto.js';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';

const doctorSelect = {
  id: true,
  userId: true,
  specialization: true,
  department: true,
  availability: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
    },
  },
} satisfies Prisma.DoctorSelect;

type DoctorResult = Prisma.DoctorGetPayload<{ select: typeof doctorSelect }>;

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(dto: CreateDoctorDto, requester: AuthenticatedUser): Promise<DoctorResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { role: true },
    });
    if (!user || user.role !== Role.DOCTOR) {
      throw new NotFoundException('A doctor user account was not found');
    }
    try {
      return await this.prisma.doctor.create({
        data: {
          hospitalId: requester.hospitalId,
          userId: dto.userId,
          specialization: dto.specialization.trim(),
          department: dto.department.trim(),
          availability: dto.availability?.trim() || null,
        },
        select: doctorSelect,
      });
    } catch (error) {
      this.handleDoctorWriteError(error, dto.userId);
      throw error;
    }
  }

  findAll(): Promise<DoctorResult[]> {
    return this.prisma.doctor.findMany({
      select: doctorSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  findBookableDoctors() {
    return this.prisma.doctor.findMany({
      select: {
        id: true,
        specialization: true,
        department: true,
        availability: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ department: 'asc' }, { user: { name: 'asc' } }],
    });
  }

  async findOne(id: string): Promise<DoctorResult> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      select: doctorSelect,
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with id "${id}" was not found`);
    }
    return doctor;
  }

  async update(id: string, dto: UpdateDoctorDto): Promise<DoctorResult> {
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { role: true },
      });
      if (!user || user.role !== Role.DOCTOR) {
        throw new NotFoundException('A doctor user account was not found');
      }
    }
    try {
      return await this.prisma.doctor.update({
        where: { id },
        data: {
          userId: dto.userId,
          specialization: dto.specialization?.trim(),
          department: dto.department?.trim(),
          availability:
            dto.availability === undefined
              ? undefined
              : dto.availability?.trim() || null,
        },
        select: doctorSelect,
      });
    } catch (error) {
      this.handleDoctorWriteError(error, dto.userId);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Doctor with id "${id}" was not found`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<DoctorResult> {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const doctor = await transaction.doctor.findUnique({
          where: { id },
          select: {
            ...doctorSelect,
            _count: { select: { appointments: true, prescriptions: true } },
          },
        });
        if (!doctor) {
          throw new NotFoundException(`Doctor with id "${id}" was not found`);
        }
        const { _count: doctorCounts, ...profile } = doctor;
        if (
          doctorCounts.appointments ||
          doctorCounts.prescriptions
        ) {
          throw new ConflictException(
            'Doctor profiles with appointment or prescription history cannot be deleted',
          );
        }
        await transaction.user.delete({ where: { id: doctor.userId } });
        return profile;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Doctor with id "${id}" was not found`);
      }
      throw error;
    }
  }

  private handleDoctorWriteError(error: unknown, userId?: string): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }

    if (error.code === 'P2002') {
      throw new ConflictException(
        'A doctor profile already exists for this user',
      );
    }
    if (error.code === 'P2003' && userId) {
      throw new NotFoundException(`User with id "${userId}" was not found`);
    }
  }
}
