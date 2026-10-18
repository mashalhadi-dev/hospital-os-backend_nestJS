import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, PrismaClient, type Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { timingSafeEqual } from 'node:crypto';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  createdAt: true,
  hospitalId: true,
  hospital: { select: { name: true, slug: true } },
  doctorProfile: { select: { id: true } },
  nurseProfile: { select: { id: true } },
  receptionistProfile: { select: { id: true } },
  patientProfile: { select: { id: true } },
} satisfies Prisma.UserSelect;

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  createdAt: Date;
  hospitalId: string;
  hospital: { name: string; slug: string };
  doctorProfile: { id: string } | null;
  nurseProfile: { id: string } | null;
  receptionistProfile: { id: string } | null;
  patientProfile: { id: string } | null;
}

export interface AuthLoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(
    dto: RegisterDto,
    trustedHospitalAdminProvisioning = false,
  ): Promise<AuthLoginResponse> {
    if (dto.role === 'ADMIN') {
      throw new ForbiddenException(
        'Administrator accounts must be provisioned through a trusted process',
      );
    }
    if (dto.role !== 'PATIENT' && !trustedHospitalAdminProvisioning) {
      const registrationSecret = this.config
        .get<string>('STAFF_REGISTRATION_SECRET')
        ?.trim();
      if (
        !registrationSecret ||
        !dto.registrationSecret ||
        !this.secretsMatch(registrationSecret, dto.registrationSecret)
      ) {
        throw new ForbiddenException(
          'A valid staff registration secret is required',
        );
      }
    }
    if (dto.role === 'PATIENT' && !dto.phone?.trim()) {
      throw new BadRequestException('phone is required for patient accounts');
    }
    const passwordBytes = Buffer.byteLength(dto.password, 'utf8');
    if (passwordBytes > 72) {
      throw new BadRequestException('Password must not exceed 72 UTF-8 bytes');
    }

    const email = dto.email.trim().toLowerCase();
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: dto.hospitalId },
      select: { id: true },
    });
    if (!hospital) throw new BadRequestException('Select a valid hospital workspace');
    const password = await bcrypt.hash(dto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email,
          password,
          ...(dto.phone === undefined ? {} : { phone: dto.phone.trim() }),
          role: dto.role,
          hospitalId: hospital.id,
          ...(dto.role === 'DOCTOR'
            ? {
                doctorProfile: {
                  create: {
                    hospitalId: hospital.id,
                    specialization: dto.specialization!.trim(),
                    department: dto.department!.trim(),
                  },
                },
              }
            : {}),
          ...(dto.role === 'NURSE'
            ? {
                nurseProfile: {
                  create: {
                    hospitalId: hospital.id,
                    department: dto.department!.trim(),
                    shift: dto.shift?.trim() || null,
                  },
                },
              }
            : {}),
          ...(dto.role === 'RECEPTIONIST'
            ? {
                receptionistProfile: {
                  create: { deskNumber: dto.deskNumber?.trim() || null },
                },
              }
            : {}),
          ...(dto.role === 'PATIENT'
            ? {
                patientProfile: {
                  create: {
                    hospitalId: hospital.id,
                    name: dto.name.trim(),
                    age: dto.age!,
                    gender: dto.gender!,
                    phone: dto.phone!.trim(),
                    address: dto.address?.trim() || null,
                    medicalHistory: dto.medicalHistory?.trim() || null,
                  },
                },
              }
            : {}),
        },
        select: publicUserSelect,
      });
      return this.issueToken(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  registerStaffForHospital(dto: RegisterDto, requester: AuthenticatedUser) {
    if (!['DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(dto.role)) {
      throw new ForbiddenException('Hospital admins may provision clinical and front-desk staff only');
    }
    return this.register(
      Object.assign(new RegisterDto(), dto, {
        hospitalId: requester.hospitalId,
      }),
      true,
    );
  }

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });
    if (!user) {
      throw new UnauthorizedException('Authenticated user no longer exists');
    }
    return user;
  }

  listUsers(): Promise<AuthUser[]> {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async login(dto: LoginDto): Promise<AuthLoginResponse> {
    const email = String(dto.email).trim().toLowerCase();
    const password = String(dto.password);
    console.log('Login attempt for:', email);

    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { ...publicUserSelect, password: true },
    });
    console.log('User found in DB:', !!user);

    const isPasswordValid = user
      ? await bcrypt.compare(password, user.password)
      : false;
    console.log('Password match result:', isPasswordValid);
    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const hasRoleProfile =
      (user.role === 'DOCTOR' && user.doctorProfile !== null) ||
      (user.role === 'NURSE' && user.nurseProfile !== null) ||
      (user.role === 'RECEPTIONIST' && user.receptionistProfile !== null) ||
      (user.role === 'PATIENT' && user.patientProfile !== null) ||
      user.role === 'ADMIN';
    if (!hasRoleProfile) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const { password: _password, ...publicUser } = user;

    return this.issueToken(publicUser);
  }

  private async issueToken(user: AuthUser): Promise<AuthLoginResponse> {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.getOrThrow<number>('JWT_EXPIRES_IN_SECONDS'),
      user,
    };
  }

  private secretsMatch(expected: string, supplied: string): boolean {
    const expectedBytes = Buffer.from(expected, 'utf8');
    const suppliedBytes = Buffer.from(supplied, 'utf8');
    return (
      expectedBytes.length === suppliedBytes.length &&
      timingSafeEqual(expectedBytes, suppliedBytes)
    );
  }
}
