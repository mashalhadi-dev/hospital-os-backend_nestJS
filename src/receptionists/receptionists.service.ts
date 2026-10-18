import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrismaClient, Role } from '@prisma/client';
import {
  CreateReceptionistDto,
  UpdateReceptionistDto,
} from './dto/receptionist.dto.js';

const receptionistSelect = {
  id: true,
  userId: true,
  deskNumber: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, name: true, email: true, phone: true } },
} satisfies Prisma.ReceptionistSelect;

@Injectable()
export class ReceptionistsService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(dto: CreateReceptionistDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { role: true },
    });
    if (!user || user.role !== Role.RECEPTIONIST) {
      throw new NotFoundException('A receptionist user account was not found');
    }
    try {
      return await this.prisma.receptionist.create({
        data: {
          userId: dto.userId,
          deskNumber: dto.deskNumber?.trim() || null,
        },
        select: receptionistSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A receptionist profile already exists for this user',
        );
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.receptionist.findMany({
      select: receptionistSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const receptionist = await this.prisma.receptionist.findUnique({
      where: { id },
      select: receptionistSelect,
    });
    if (!receptionist) {
      throw new NotFoundException(`Receptionist with id "${id}" was not found`);
    }
    return receptionist;
  }

  async update(id: string, dto: UpdateReceptionistDto) {
    try {
      return await this.prisma.receptionist.update({
        where: { id },
        data: {
          deskNumber:
            dto.deskNumber === undefined
              ? undefined
              : dto.deskNumber?.trim() || null,
        },
        select: receptionistSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Receptionist with id "${id}" was not found`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    const receptionist = await this.findOne(id);
    try {
      await this.prisma.user.delete({ where: { id: receptionist.userId } });
      return receptionist;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Receptionist with id "${id}" was not found`);
      }
      throw error;
    }
  }
}
