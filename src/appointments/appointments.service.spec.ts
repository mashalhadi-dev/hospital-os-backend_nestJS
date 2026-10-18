import { BadRequestException } from '@nestjs/common';
import { AppointmentStatus, Role } from '@prisma/client';
import { AppointmentsService } from './appointments.service.js';

describe('AppointmentsService', () => {
  it('does not allow reopening a completed appointment', async () => {
    const prisma = {
      appointment: {
        findUnique: vi.fn().mockResolvedValue({
          doctorId: 'e7d9d88a-c57b-4d3b-bce3-e25f7bfa898c',
          status: AppointmentStatus.COMPLETED,
        }),
        update: vi.fn(),
      },
    };
    const gateway = { publishQueueUpdate: vi.fn() };
    const service = new AppointmentsService(prisma as never, gateway as never);

    await expect(
      service.updateStatus(
        '2bbfdc6a-1f85-4c25-8a1a-5df94bef5a72',
        { status: AppointmentStatus.PENDING },
        {
          id: '29a38de4-6c0e-4cf5-a1de-a3f1ec84f4bc',
          role: Role.ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.appointment.update).not.toHaveBeenCalled();
  });
});
