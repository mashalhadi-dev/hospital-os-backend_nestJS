// src/patients/patients.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  // 1. Naya Patient Register Karna + Unique Medical ID Generate Karna
  async create(createPatientDto: CreatePatientDto) {
    // Check karein ke CNIC pehle se registered toh nahi
    const existingPatient = await this.prisma.patient.findUnique({
      where: { cnic: createPatientDto.cnic },
    });

    if (existingPatient) {
      throw new BadRequestException('Patient with this CNIC already exists!');
    }

    // Unique Medical ID generate karne ka logic (e.g., PT-1001)
    const count = await this.prisma.patient.count();
    const medicalId = `PT-${1000 + count + 1}`;

    // Database mein save karein
    const patient = await this.prisma.patient.create({
      data: {
        medicalId,
        firstName: createPatientDto.firstName,
        lastName: createPatientDto.lastName,
        cnic: createPatientDto.cnic,
        phone: createPatientDto.phone,
        dob: new Date(createPatientDto.dob),
        gender: createPatientDto.gender,
        bloodGroup: createPatientDto.bloodGroup,
        emergencyContact: createPatientDto.emergencyContact,
      },
    });

    return {
      message: 'Patient registered successfully!',
      patient,
    };
  }

  // 2. Search & Pagination ke sath Patients ki List Nikalna
  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    // Search filter (agar user ne naam, phone ya CNIC likha ho)
    const whereClause = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { cnic: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { medicalId: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where: whereClause }),
    ]);

    return {
      data: patients,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  // 3. Ek Patient ki Detail Profile (History aur Vitals ke sath) Nikalna
  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        medicalHistories: { orderBy: { visitDate: 'desc' } },
        vitals: { orderBy: { recordedAt: 'desc' } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }
}