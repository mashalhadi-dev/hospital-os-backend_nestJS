import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Gender, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import type { RegisterDto } from './dto/register.dto.js';

describe('AuthService', () => {
  const createdUser = {
    id: 'b33ca0c8-1e12-4aed-9137-cbff2a8aa7e8',
    email: 'patient@example.com',
    name: 'Test Patient',
    role: Role.PATIENT,
    phone: '555-0100',
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    doctorProfile: null,
    nurseProfile: null,
    receptionistProfile: null,
    patientProfile: { id: 'e4cab8b4-a7c9-4baf-8cec-a6b0868aa3aa' },
  };

  const prisma = {
    user: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
  };
  const jwtService = { signAsync: vi.fn() };
  const config = { get: vi.fn(), getOrThrow: vi.fn() };

  const service = new AuthService(
    prisma as never,
    jwtService as never,
    config as never,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.user.create.mockResolvedValue(createdUser);
    prisma.user.findUnique.mockResolvedValue(null);
    jwtService.signAsync.mockResolvedValue('signed-token');
    config.get.mockReturnValue(undefined);
    config.getOrThrow.mockReturnValue(3600);
  });

  it('creates and links a patient profile during signup', async () => {
    const dto: RegisterDto = {
      name: 'Test Patient',
      email: 'PATIENT@example.com',
      password: 'safe-password-123',
      phone: '555-0100',
      role: Role.PATIENT,
      age: 35,
      gender: Gender.FEMALE,
    };

    const response = await service.register(dto);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'patient@example.com',
          role: Role.PATIENT,
          patientProfile: {
            create: expect.objectContaining({
              name: 'Test Patient',
              age: 35,
              gender: Gender.FEMALE,
              phone: '555-0100',
            }),
          },
        }),
      }),
    );
    expect(response.accessToken).toBe('signed-token');
    expect(response.user).toEqual(createdUser);
    const data = prisma.user.create.mock.calls[0][0].data as {
      password: string;
    };
    await expect(bcrypt.compare(dto.password, data.password)).resolves.toBe(
      true,
    );
  });

  it('rejects public administrator signup', async () => {
    const dto = {
      name: 'Administrator',
      email: 'admin@example.com',
      password: 'safe-password-123',
      role: Role.ADMIN,
    } as RegisterDto;

    await expect(service.register(dto)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      role: Role.DOCTOR,
      profileKey: 'doctorProfile',
      fields: {
        specialization: 'Cardiology',
        department: 'Cardiac ICU',
      },
    },
    {
      role: Role.NURSE,
      profileKey: 'nurseProfile',
      fields: { department: 'ICU', shift: 'Night' },
    },
    {
      role: Role.RECEPTIONIST,
      profileKey: 'receptionistProfile',
      fields: { deskNumber: 'Front Desk' },
    },
  ])('creates a linked $role profile', async ({ role, profileKey, fields }) => {
    config.get.mockReturnValue('staff-secret');
    await service.register({
      name: 'Staff Member',
      email: `${role.toLowerCase()}@example.com`,
      password: 'safe-password-123',
      role,
      registrationSecret: 'staff-secret',
      ...fields,
    } as RegisterDto);

    const createData = prisma.user.create.mock.calls[0][0].data as Record<
      string,
      unknown
    >;
    expect(createData.role).toBe(role);
    expect(createData[profileKey]).toEqual({
      create: expect.any(Object),
    });
  });

  it('authenticates against the stored bcrypt hash and returns a JWT', async () => {
    const password = 'safe-password-123';
    const passwordHash = await bcrypt.hash(password, 4);
    prisma.user.findUnique.mockResolvedValue({
      ...createdUser,
      password: passwordHash,
    });

    const response = await service.login({
      email: 'PATIENT@example.com',
      password,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: 'patient@example.com' },
      }),
    );
    expect(response.accessToken).toBe('signed-token');
    expect(response.user).toEqual(createdUser);
  });

  it('rejects an incorrect password without issuing a token', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...createdUser,
      password: await bcrypt.hash('another-password', 4),
    });

    await expect(
      service.login({
        email: createdUser.email,
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
