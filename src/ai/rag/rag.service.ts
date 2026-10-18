import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/guards/jwt-auth.guard.js';

const patientContextSelect = {
  id: true,
  userId: true,
  age: true,
  gender: true,
  medicalHistory: true,
  prescriptions: {
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      diagnosis: true,
      instructions: true,
      createdAt: true,
      items: {
        select: {
          dosage: true,
          quantity: true,
          medicine: { select: { name: true } },
        },
      },
    },
  },
  appointments: {
    orderBy: { appointmentDate: 'desc' },
    take: 25,
    select: {
      appointmentDate: true,
      status: true,
      symptoms: true,
      notes: true,
    },
  },
} satisfies Prisma.PatientSelect;

type PatientContext = Prisma.PatientGetPayload<{
  select: typeof patientContextSelect;
}>;

@Injectable()
export class RagService {
  constructor(private readonly prisma: PrismaClient) {}

  async retrievePatientContext(
    patientId: string,
    requester: AuthenticatedUser,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: patientContextSelect,
    });
    if (!patient) {
      throw new NotFoundException(
        `Patient with id "${patientId}" was not found`,
      );
    }

    if (requester.role === Role.PATIENT) {
      if (patient.userId !== requester.id) {
        throw new ForbiddenException(
          'You may only request your own medical record',
        );
      }
      return this.toClinicalContext(patient);
    }
    if (requester.role === Role.ADMIN) {
      return this.toClinicalContext(patient);
    }
    if (requester.role !== Role.DOCTOR) {
      throw new ForbiddenException(
        'Only a patient or authorized clinician may use AI',
      );
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: requester.id },
      select: { id: true },
    });
    if (!doctor) {
      throw new ForbiddenException(
        'No doctor profile is linked to this account',
      );
    }
    const hasCareRelationship = await this.prisma.appointment.findFirst({
      where: { patientId, doctorId: doctor.id },
      select: { id: true },
    });
    const hasPrescription = await this.prisma.prescription.findFirst({
      where: { patientId, doctorId: doctor.id },
      select: { id: true },
    });
    if (!hasCareRelationship && !hasPrescription) {
      throw new ForbiddenException('You are not assigned to this patient');
    }

    return this.toClinicalContext(patient);
  }

  async retrieveNursePatientContext(
    patientId: string,
    requester: AuthenticatedUser,
  ) {
    if (requester.role !== Role.NURSE) {
      throw new ForbiddenException('Only nurses may use nursing AI support');
    }

    const nurse = await this.prisma.nurse.findUnique({
      where: { userId: requester.id },
      select: { id: true },
    });
    if (!nurse) {
      throw new ForbiddenException('No nurse profile is linked to this account');
    }

    const patientExists = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });
    if (!patientExists) {
      throw new NotFoundException(
        `Patient with id "${patientId}" was not found`,
      );
    }

    const [recordedVitals, recordedAdministration] = await Promise.all([
      this.prisma.vitalSign.findFirst({
        where: { patientId, nurseUserId: requester.id },
        select: { id: true },
      }),
      this.prisma.medicationAdministration.findFirst({
        where: {
          nurseUserId: requester.id,
          prescriptionItem: { prescription: { patientId } },
        },
        select: { id: true },
      }),
    ]);
    if (!recordedVitals && !recordedAdministration) {
      throw new ForbiddenException(
        'Nursing AI is limited to patients with a care record you documented',
      );
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        age: true,
        gender: true,
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          take: 25,
          select: {
            diagnosis: true,
            instructions: true,
            createdAt: true,
            items: {
              select: {
                dosage: true,
                quantity: true,
                medicine: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!patient) {
      throw new NotFoundException(
        `Patient with id "${patientId}" was not found`,
      );
    }

    const [vitalSigns, medicationAdministrations] = await Promise.all([
      this.prisma.vitalSign.findMany({
        where: { patientId, nurseUserId: requester.id },
        orderBy: { recordedAt: 'desc' },
        take: 50,
        select: {
          systolicBloodPressure: true,
          diastolicBloodPressure: true,
          oxygenSaturation: true,
          heartRate: true,
          temperatureCelsius: true,
          bloodGlucoseMgDl: true,
          recordedAt: true,
        },
      }),
      this.prisma.medicationAdministration.findMany({
        where: {
          nurseUserId: requester.id,
          prescriptionItem: { prescription: { patientId } },
        },
        orderBy: { administeredAt: 'desc' },
        take: 50,
        select: {
          notes: true,
          administeredAt: true,
          prescriptionItem: {
            select: {
              dosage: true,
              quantity: true,
              medicine: { select: { name: true } },
              prescription: {
                select: { diagnosis: true, instructions: true, createdAt: true },
              },
            },
          },
        },
      }),
    ]);

    return {
      age: patient.age,
      gender: patient.gender,
      prescriptions: patient.prescriptions,
      vitalSigns,
      medicationAdministrations,
    };
  }

  private toClinicalContext(patient: PatientContext) {
    return {
      age: patient.age,
      gender: patient.gender,
      medicalHistory: patient.medicalHistory,
      prescriptions: patient.prescriptions,
      appointments: patient.appointments.map((appointment) => ({
        appointmentDate: appointment.appointmentDate,
        status: appointment.status,
        symptoms: appointment.symptoms,
        notes: appointment.notes,
      })),
    };
  }
}
