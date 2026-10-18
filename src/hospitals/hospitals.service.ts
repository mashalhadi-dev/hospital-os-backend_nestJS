import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { RegisterHospitalDto } from './dto/register-hospital.dto.js';

const userSelect = {
  id: true, email: true, name: true, role: true, phone: true, createdAt: true,
  hospitalId: true, hospital: { select: { name: true, slug: true } },
  doctorProfile: { select: { id: true } }, nurseProfile: { select: { id: true } },
  receptionistProfile: { select: { id: true } }, patientProfile: { select: { id: true } },
} satisfies Prisma.UserSelect;

@Injectable()
export class HospitalsService {
  constructor(private readonly prisma: PrismaClient, private readonly jwt: JwtService, private readonly config: ConfigService) {}

  list() {
    return this.prisma.hospital.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } });
  }

  async register(dto: RegisterHospitalDto) {
    const slug = dto.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const email = dto.email.trim().toLowerCase();
    const password = await bcrypt.hash(dto.password, 10);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const hospital = await tx.hospital.create({ data: { name: dto.name.trim(), slug, address: dto.address?.trim() || null, phone: dto.phone?.trim() || null } });
        const user = await tx.user.create({
          data: { name: dto.ownerName.trim(), email, password, role: Role.ADMIN, hospitalId: hospital.id },
          select: userSelect,
        });
        return { hospital, user };
      });
      const accessToken = await this.jwt.signAsync({ sub: result.user.id, email, role: Role.ADMIN, hospitalId: result.hospital.id });
      return { hospital: result.hospital, accessToken, tokenType: 'Bearer' as const, expiresIn: this.config.getOrThrow<number>('JWT_EXPIRES_IN_SECONDS'), user: result.user };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('The workspace slug or owner email is already in use');
      throw error;
    }
  }
}
