import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';
import { AppointmentsGateway } from './appointments.gateway.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';

const appointmentSelect = {
  id: true,
  patientId: true,
  doctorId: true,
  appointmentDate: true,
  status: true,
  symptoms: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, name: true } },
  doctor: {
    select: {
      id: true,
      specialization: true,
      department: true,
      user: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.AppointmentSelect;

export type AppointmentResult = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly appointmentsGateway: AppointmentsGateway,
  ) {}

  async create(
    dto: CreateAppointmentDto,
    requester: AuthenticatedUser,
  ): Promise<AppointmentResult> {
    const appointmentDate = new Date(dto.appointmentDate);
    if (Number.isNaN(appointmentDate.getTime())) {
      throw new BadRequestException('appointmentDate must be a valid date');
    }
    await this.assertCanCreate(dto, requester);

    let appointment: AppointmentResult;
    try {
      appointment = await this.prisma.appointment.create({
        data: {
          hospitalId: requester.hospitalId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          appointmentDate,
          status: requester.role === Role.RECEPTIONIST ? AppointmentStatus.IN_QUEUE : AppointmentStatus.PENDING,
          symptoms: dto.symptoms?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
        select: appointmentSelect,
      });
    } catch (error) {
      this.handleAppointmentWriteError(error);
      throw error;
    }

    await this.publishQueueUpdate(appointment, 'appointment.created');
    return appointment;
  }

  findAll(requester: AuthenticatedUser): Promise<AppointmentResult[]> {
    const where: Prisma.AppointmentWhereInput =
      requester.role === Role.DOCTOR
        ? { doctor: { userId: requester.id } }
        : requester.role === Role.PATIENT
          ? { patient: { userId: requester.id } }
          : {};
    return this.prisma.appointment.findMany({
      where,
      select: appointmentSelect,
      orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<AppointmentResult> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: appointmentSelect,
    });
    if (!appointment) {
      throw new NotFoundException(`Appointment with id "${id}" was not found`);
    }
    await this.assertCanRead(id, requester);
    return appointment;
  }

  async getDoctorQueue(
    doctorId: string,
    requester: AuthenticatedUser,
  ): Promise<AppointmentResult[]> {
    if (requester.role === Role.DOCTOR) {
      const ownProfile = await this.prisma.doctor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      if (ownProfile?.id !== doctorId) {
        throw new ForbiddenException('You may only access your own queue');
      }
    }
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with id "${doctorId}" was not found`);
    }
    return this.fetchDoctorQueue(doctorId);
  }

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    requester: AuthenticatedUser,
  ): Promise<AppointmentResult> {
    let existing: { doctorId: string; patientId: string; status: AppointmentStatus } | null;
    if (requester.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      existing = await this.prisma.appointment.findUnique({
        where: { id },
        select: { doctorId: true, patientId: true, status: true },
      });
      if (!existing) {
        throw new NotFoundException(`Appointment with id "${id}" was not found`);
      }
      if (existing.doctorId !== doctor?.id) {
        throw new ForbiddenException('You may only update your own appointments');
      }
    } else if (requester.role === Role.PATIENT) {
      // Patients may only touch their own appointments, and only to cancel them.
      const patient = await this.prisma.patient.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      existing = await this.prisma.appointment.findUnique({
        where: { id },
        select: { doctorId: true, patientId: true, status: true },
      });
      if (!existing) {
        throw new NotFoundException(`Appointment with id "${id}" was not found`);
      }
      if (existing.patientId !== patient?.id) {
        throw new ForbiddenException(
          'You may only manage your own appointments',
        );
      }
      if (dto.status !== AppointmentStatus.CANCELLED) {
        throw new ForbiddenException(
          'Patients may only cancel their own appointments',
        );
      }
    } else {
      existing = await this.prisma.appointment.findUnique({
        where: { id },
        select: { doctorId: true, patientId: true, status: true },
      });
      if (!existing) {
        throw new NotFoundException(`Appointment with id "${id}" was not found`);
      }
    }
    this.assertStatusTransition(existing.status, dto.status);

    let appointment: AppointmentResult;
    try {
      appointment = await this.prisma.appointment.update({
        where: { id },
        data: { status: dto.status },
        select: appointmentSelect,
      });
    } catch (error) {
      this.handleAppointmentWriteError(error);
      throw error;
    }
    await this.publishQueueUpdate(appointment, 'appointment.status.updated');
    return appointment;
  }

  private assertStatusTransition(
    current: AppointmentStatus,
    next: AppointmentStatus,
  ): void {
    if (current === next) {
      return;
    }
    const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.PENDING]: [
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_QUEUE,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.IN_QUEUE]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
      [AppointmentStatus.CONFIRMED]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.COMPLETED]: [],
      [AppointmentStatus.CANCELLED]: [],
    };
    if (!allowed[current].includes(next)) {
      throw new BadRequestException(
        `Appointment cannot transition from ${current} to ${next}`,
      );
    }
  }

  private async assertCanCreate(
    dto: CreateAppointmentDto,
    requester: AuthenticatedUser,
  ): Promise<void> {
    const [patient, doctor] = await Promise.all([
      this.prisma.patient.findFirst({ where: { id: dto.patientId }, select: { id: true } }),
      this.prisma.doctor.findFirst({ where: { id: dto.doctorId }, select: { id: true } }),
    ]);
    if (!patient || !doctor) throw new NotFoundException('Patient or doctor was not found in this hospital workspace');
    if (requester.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      if (!patient || patient.id !== dto.patientId) {
        throw new ForbiddenException('You may only book appointments for yourself');
      }
    }
    if (requester.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: requester.id },
        select: { id: true },
      });
      if (!doctor || doctor.id !== dto.doctorId) {
        throw new ForbiddenException('You may only book appointments for yourself');
      }
    }
  }

  private async assertCanRead(
    id: string,
    requester: AuthenticatedUser,
  ): Promise<void> {
    if (requester.role !== Role.PATIENT && requester.role !== Role.DOCTOR) {
      return;
    }
    const record = await this.prisma.appointment.findUnique({
      where: { id },
      select: {
        patient: { select: { userId: true } },
        doctor: { select: { userId: true } },
      },
    });
    const userId =
      requester.role === Role.PATIENT
        ? record?.patient.userId
        : record?.doctor.userId;
    if (userId !== requester.id) {
      throw new ForbiddenException('You may only access your own appointments');
    }
  }

  private fetchDoctorQueue(doctorId: string): Promise<AppointmentResult[]> {
    return this.prisma.appointment.findMany({
      where: {
        doctorId,
        status: {
          in: [AppointmentStatus.PENDING, AppointmentStatus.IN_QUEUE, AppointmentStatus.CONFIRMED],
        },
      },
      select: appointmentSelect,
      orderBy: [{ appointmentDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async publishQueueUpdate(
    appointment: AppointmentResult,
    change: 'appointment.created' | 'appointment.status.updated',
  ): Promise<void> {
    try {
      const queue = await this.fetchDoctorQueue(appointment.doctorId);
      this.appointmentsGateway.publishQueueUpdate({
        doctorId: appointment.doctorId,
        change,
        appointmentId: appointment.id,
        status: appointment.status,
        queue: queue.map((queuedAppointment) => ({
          id: queuedAppointment.id,
          patientId: queuedAppointment.patientId,
          patientName: queuedAppointment.patient.name,
          appointmentDate: queuedAppointment.appointmentDate,
          status: queuedAppointment.status,
        })),
        occurredAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish queue update for appointment "${appointment.id}" and doctor "${appointment.doctorId}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private handleAppointmentWriteError(error: unknown): void {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
      return;
    }
    if (error.code === 'P2025') {
      throw new NotFoundException('Appointment or related record was not found');
    }
    if (error.code === 'P2003') {
      throw new NotFoundException('Patient or doctor was not found');
    }
  }
}
