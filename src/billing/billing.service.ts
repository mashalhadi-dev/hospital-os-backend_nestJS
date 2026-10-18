import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingStatus, Prisma, PrismaClient, Role } from '@prisma/client';
import type { AuthenticatedUser } from '../common/guards/jwt-auth.guard.js';
import { CreateBillingDto, UpdateBillingDto } from './dto/create-billing.dto.js';

const billingSelect = {
  id: true,
  patientId: true,
  totalAmount: true,
  paidAmount: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, name: true } },
  items: {
    select: {
      id: true,
      medicineId: true,
      description: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
    },
  },
} satisfies Prisma.BillingSelect;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaClient) {}

  async create(dto: CreateBillingDto, requester: AuthenticatedUser) {
    const lines = await this.prisma.$transaction(async (transaction) => {
      const patient = await transaction.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException(
          `Patient with id "${dto.patientId}" was not found`,
        );
      }
      const items: Array<{
        medicineId: string | null;
        description: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];

      for (const item of dto.items) {
        let medicineId: string | null = null;
        let description = item.description?.trim() ?? '';
        let unitPrice = item.unitPrice;
        if (item.medicineId) {
          const medicine = await transaction.medicine.findUnique({
            where: { id: item.medicineId },
            select: { id: true, name: true, price: true },
          });
          if (!medicine) {
            throw new NotFoundException(
              `Medicine with id "${item.medicineId}" was not found`,
            );
          }
          medicineId = medicine.id;
          description ||= medicine.name;
          unitPrice = medicine.price;
        }
        if (unitPrice === undefined || !description) {
          throw new BadRequestException(
            'Each billing item needs a medicine or both description and unitPrice',
          );
        }
        const totalPrice = Math.round(unitPrice * item.quantity * 100) / 100;
        items.push({
          medicineId,
          description,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });
      }

      const totalAmount =
        Math.round(items.reduce((sum, item) => sum + item.totalPrice, 0) * 100) /
        100;
      if (!Number.isFinite(totalAmount) || totalAmount > 1000000000) {
        throw new BadRequestException('totalAmount exceeds the supported limit');
      }
      const paidAmount = dto.paidAmount ?? 0;
      if (paidAmount > totalAmount) {
        throw new BadRequestException('paidAmount cannot exceed totalAmount');
      }
      const status =
        dto.status === BillingStatus.CANCELLED
          ? BillingStatus.CANCELLED
          : paidAmount === totalAmount
            ? BillingStatus.PAID
            : BillingStatus.PENDING;
      if (dto.status === BillingStatus.PAID && status !== BillingStatus.PAID) {
        throw new BadRequestException(
          'A bill can be PAID only when paidAmount equals totalAmount',
        );
      }

      if (status !== BillingStatus.CANCELLED) {
        for (const item of items) {
          if (!item.medicineId) continue;
          const update = await transaction.medicine.updateMany({
            where: {
              id: item.medicineId,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (!update.count) {
            throw new ConflictException(
              `Insufficient stock for medicine "${item.description}"`,
            );
          }
        }
      }

      return transaction.billing.create({
        data: {
          hospitalId: requester.hospitalId,
          patientId: dto.patientId,
          totalAmount,
          paidAmount,
          status,
          items: { create: items },
        },
        select: billingSelect,
      });
    });
    return lines;
  }

  findAll(requester: AuthenticatedUser) {
    return this.prisma.billing.findMany({
      where:
        requester.role === Role.PATIENT
          ? { patient: { userId: requester.id } }
          : {},
      select: billingSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requester: AuthenticatedUser) {
    const billing = await this.prisma.billing.findFirst({
      where: {
        id,
        ...(requester.role === Role.PATIENT
          ? { patient: { userId: requester.id } }
          : {}),
      },
      select: billingSelect,
    });
    if (!billing) {
      throw new NotFoundException(`Billing record with id "${id}" was not found`);
    }
    return billing;
  }

  async update(id: string, dto: UpdateBillingDto) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.billing.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) {
        throw new NotFoundException(`Billing record with id "${id}" was not found`);
      }
      if (current.status === BillingStatus.CANCELLED) {
        if (
          (dto.status !== undefined &&
            dto.status !== BillingStatus.CANCELLED) ||
          (dto.paidAmount !== undefined &&
            dto.paidAmount !== current.paidAmount)
        ) {
          throw new BadRequestException('A cancelled bill cannot be modified');
        }
        return transaction.billing.findUniqueOrThrow({
          where: { id },
          select: billingSelect,
        });
      }
      const paidAmount = dto.paidAmount ?? current.paidAmount;
      if (paidAmount > current.totalAmount) {
        throw new BadRequestException('paidAmount cannot exceed totalAmount');
      }
      const status =
        dto.status === BillingStatus.CANCELLED
          ? BillingStatus.CANCELLED
          : paidAmount === current.totalAmount
            ? BillingStatus.PAID
            : BillingStatus.PENDING;
      if (dto.status === BillingStatus.PAID && status !== BillingStatus.PAID) {
        throw new BadRequestException(
          'A bill can be PAID only when paidAmount equals totalAmount',
        );
      }
      let cancellationWon = false;
      if (status === BillingStatus.CANCELLED) {
        const transition = await transaction.billing.updateMany({
          where: { id, status: { not: BillingStatus.CANCELLED } },
          data: { status: BillingStatus.CANCELLED },
        });
        cancellationWon = transition.count === 1;
      }
      if (cancellationWon) {
        for (const item of current.items) {
          if (item.medicineId) {
            await transaction.medicine.update({
              where: { id: item.medicineId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
      return transaction.billing.update({
        where: { id },
        data: { paidAmount, status },
        select: billingSelect,
      });
    });
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.billing.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!current) {
        throw new NotFoundException(`Billing record with id "${id}" was not found`);
      }
      if (current.status !== BillingStatus.CANCELLED) {
        for (const item of current.items) {
          if (item.medicineId) {
            await transaction.medicine.update({
              where: { id: item.medicineId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      }
      return transaction.billing.delete({
        where: { id },
        select: billingSelect,
      });
    });
  }
}
