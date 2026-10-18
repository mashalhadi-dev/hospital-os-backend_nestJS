import 'dotenv/config';
import { createHash } from 'node:crypto';
import {
  AppointmentStatus,
  BillingStatus,
  Gender,
  PrismaClient,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const password = 'Password123!';
const frontendBaseUrl = (
  process.env.FRONTEND_BASE_URL ?? 'http://localhost:3001'
).replace(/\/+$/, '');

type UserSeed = {
  email: string;
  name: string;
  role: Role;
  phone: string;
  profile:
    | { kind: 'admin' }
    | {
        kind: 'doctor';
        specialization: string;
        department: string;
        availability: string;
      }
    | { kind: 'nurse'; department: string; shift: string }
    | { kind: 'receptionist'; deskNumber: string }
    | {
        kind: 'patient';
        age: number;
        gender: Gender;
        address: string;
        bloodGroup: string;
        medicalHistory: string;
      };
};

const users: UserSeed[] = [
  {
    email: 'admin@hospital.com',
    name: 'Hospital Administrator',
    role: Role.ADMIN,
    phone: '+1-555-010-0001',
    profile: { kind: 'admin' },
  },
  {
    email: 'doctor.cardio@hospital.com',
    name: 'Dr. Maya Chen',
    role: Role.DOCTOR,
    phone: '+1-555-010-0101',
    profile: {
      kind: 'doctor',
      specialization: 'Cardiology',
      department: 'Cardiology',
      availability: 'Monday-Friday, 09:00-17:00',
    },
  },
  {
    email: 'doctor.neuro@hospital.com',
    name: 'Dr. Elias Morgan',
    role: Role.DOCTOR,
    phone: '+1-555-010-0102',
    profile: {
      kind: 'doctor',
      specialization: 'Neurology',
      department: 'Neurology',
      availability: 'Monday-Friday, 09:00-17:00',
    },
  },
  {
    email: 'nurse.sarah@hospital.com',
    name: 'Sarah Patel, RN',
    role: Role.NURSE,
    phone: '+1-555-010-0201',
    profile: {
      kind: 'nurse',
      department: 'Medical-Surgical',
      shift: 'Day (07:00-19:00)',
    },
  },
  {
    email: 'nurse.john@hospital.com',
    name: 'John Rivera, RN',
    role: Role.NURSE,
    phone: '+1-555-010-0202',
    profile: {
      kind: 'nurse',
      department: 'Medical-Surgical',
      shift: 'Night (19:00-07:00)',
    },
  },
  {
    email: 'receptionist@hospital.com',
    name: 'Avery Brooks',
    role: Role.RECEPTIONIST,
    phone: '+1-555-010-0301',
    profile: { kind: 'receptionist', deskNumber: 'FRONT-01' },
  },
  ...[
    [
      'Olivia Bennett',
      34,
      Gender.FEMALE,
      'A+',
      'Seasonal allergic rhinitis; no other history recorded.',
    ],
    [
      'Liam Carter',
      52,
      Gender.MALE,
      'O+',
      'Hypertension reported; synthetic demonstration record.',
    ],
    [
      'Sophia Kim',
      28,
      Gender.FEMALE,
      'B+',
      'Migraine history reported; synthetic demonstration record.',
    ],
    [
      'Noah Williams',
      45,
      Gender.MALE,
      'O-',
      'Type 2 diabetes reported; synthetic demonstration record.',
    ],
    [
      'Isabella Garcia',
      61,
      Gender.FEMALE,
      'AB+',
      'Osteoarthritis reported; synthetic demonstration record.',
    ],
    [
      'Ethan Davis',
      39,
      Gender.MALE,
      'A-',
      'Asthma reported; synthetic demonstration record.',
    ],
    [
      'Mia Thompson',
      47,
      Gender.FEMALE,
      'B-',
      'Hypothyroidism reported; synthetic demonstration record.',
    ],
    ['Lucas Martin', 31, Gender.MALE, 'O+', 'No significant history reported.'],
    [
      'Amelia Robinson',
      56,
      Gender.FEMALE,
      'A+',
      'Hyperlipidemia reported; synthetic demonstration record.',
    ],
    [
      'James Wilson',
      42,
      Gender.MALE,
      'AB-',
      'No significant history reported.',
    ],
  ].map(([name, age, gender, bloodGroup, medicalHistory], index): UserSeed => ({
    email: `patient${index + 1}@gmail.com`,
    name: String(name),
    role: Role.PATIENT,
    phone: `+1-555-010-${String(1001 + index).padStart(4, '0')}`,
    profile: {
      kind: 'patient',
      age: Number(age),
      gender: gender as Gender,
      address: `${100 + index} Demo Avenue, Sample City`,
      bloodGroup: String(bloodGroup),
      medicalHistory: String(medicalHistory),
    },
  })),
];

const medicineSeeds = [
  ['Paracetamol 500 mg', 'Analgesic and antipyretic; tablet', 0.12, 1200],
  ['Amoxicillin 500 mg', 'Penicillin antibiotic; capsule', 0.38, 420],
  ['Metformin 500 mg', 'Oral antihyperglycemic; tablet', 0.16, 780],
  ['Amlodipine 5 mg', 'Calcium-channel blocker; tablet', 0.14, 560],
  ['Atorvastatin 20 mg', 'Lipid-lowering agent; tablet', 0.21, 630],
  ['Omeprazole 20 mg', 'Proton-pump inhibitor; capsule', 0.19, 510],
  ['Cetirizine 10 mg', 'Antihistamine; tablet', 0.11, 350],
  [
    'Salbutamol 100 mcg inhaler',
    'Short-acting bronchodilator; inhaler',
    8.75,
    95,
  ],
  ['Ibuprofen 400 mg', 'NSAID analgesic; tablet', 0.13, 680],
  ['Azithromycin 250 mg', 'Macrolide antibiotic; tablet', 0.42, 230],
  ['Losartan 50 mg', 'Angiotensin receptor blocker; tablet', 0.24, 470],
  ['Insulin glargine 100 units/mL', 'Long-acting insulin; 3 mL pen', 24.5, 60],
  ['Ondansetron 4 mg', 'Antiemetic; tablet', 0.29, 190],
  ['Levothyroxine 50 mcg', 'Thyroid hormone replacement; tablet', 0.17, 390],
  ['Ceftriaxone 1 g', 'Cephalosporin antibiotic; vial', 2.85, 140],
  ['Loratadine 10 mg', 'Non-sedating antihistamine; tablet', 0.1, 310],
  ['Furosemide 40 mg', 'Loop diuretic; tablet', 0.15, 260],
  ['Aspirin 81 mg', 'Antiplatelet; tablet', 0.06, 900],
] as const;

const statusForPatient = (index: number): AppointmentStatus => {
  if (index < 3) return AppointmentStatus.CONFIRMED;
  if (index < 5) return AppointmentStatus.PENDING;
  return AppointmentStatus.COMPLETED;
};

function stableId(key: string): string {
  const hex = createHash('sha256')
    .update(`hospital-os-demo-seed:${key}`)
    .digest('hex')
    .slice(0, 32);
  const variant = ((Number.parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function appointmentTime(
  index: number,
  status: AppointmentStatus,
  now: Date,
): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const minuteOfDay =
    status === AppointmentStatus.COMPLETED
      ? Math.max(0, nowMinutes - (index - 4) * 20)
      : Math.min(23 * 60 + 45, nowMinutes + (index - 2) * 20 + 15);
  date.setMinutes(minuteOfDay);
  return date;
}

function dashboardFor(role: Role): string {
  const path: Record<Role, string> = {
    [Role.ADMIN]: '/admin',
    [Role.DOCTOR]: '/doctor',
    [Role.NURSE]: '/nurse',
    [Role.RECEPTIONIST]: '/receptionist',
    [Role.PATIENT]: '/patient',
  };
  return `${frontendBaseUrl}${path[role]}`;
}

async function seed(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production environment');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error(
      'SEED_PASSWORD must be no more than 72 UTF-8 bytes for bcrypt',
    );
  }

  // Keep the seeded credentials aligned with AuthService.login's bcrypt.compare.
  // Every upsert updates existing seed accounts as well as newly-created records.
  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const now = new Date();
  const hospitalId = '00000000-0000-4000-8000-000000000001';

  await prisma.$transaction(
    async (tx) => {
      await tx.hospital.upsert({
        where: { id: hospitalId },
        create: { id: hospitalId, name: 'City Care General Hospital', slug: 'city-care-general' },
        update: { name: 'City Care General Hospital', slug: 'city-care-general' },
      });
      const seededUsers = new Map<string, { id: string; role: Role }>();

      for (const userSeed of users) {
        const id = stableId(`user:${userSeed.email}`);
        const existing = await tx.user.findUnique({
          where: { email: userSeed.email },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          throw new Error(
            `Refusing to take over existing account ${userSeed.email}; resolve the email collision before seeding`,
          );
        }

        const user = await tx.user.upsert({
          where: { email: userSeed.email },
          create: {
            id,
            hospitalId,
            email: userSeed.email,
            password: hashedPassword,
            name: userSeed.name,
            role: userSeed.role,
            phone: userSeed.phone,
          },
          update: {
            password: hashedPassword,
            name: userSeed.name,
            role: userSeed.role,
            phone: userSeed.phone,
            hospitalId,
          },
          select: { id: true, role: true },
        });
        seededUsers.set(userSeed.email, user);
      }

      for (const userSeed of users) {
        const user = seededUsers.get(userSeed.email)!;
        const profile = userSeed.profile;
        switch (profile.kind) {
          case 'admin':
            break;
          case 'doctor':
            await tx.doctor.upsert({
              where: { userId: user.id },
              create: {
                id: stableId(`doctor:${userSeed.email}`),
                hospitalId,
                userId: user.id,
                specialization: profile.specialization,
                department: profile.department,
                availability: profile.availability,
              },
              update: {
                hospitalId,
                specialization: profile.specialization,
                department: profile.department,
                availability: profile.availability,
              },
            });
            break;
          case 'nurse':
            await tx.nurse.upsert({
              where: { userId: user.id },
              create: {
                id: stableId(`nurse:${userSeed.email}`),
                hospitalId,
                userId: user.id,
                department: profile.department,
                shift: profile.shift,
              },
              update: { hospitalId, department: profile.department, shift: profile.shift },
            });
            break;
          case 'receptionist':
            await tx.receptionist.upsert({
              where: { userId: user.id },
              create: {
                id: stableId(`receptionist:${userSeed.email}`),
                userId: user.id,
                deskNumber: profile.deskNumber,
              },
              update: { deskNumber: profile.deskNumber },
            });
            break;
          case 'patient':
            await tx.patient.upsert({
              where: { userId: user.id },
              create: {
                id: stableId(`patient:${userSeed.email}`),
                hospitalId,
                userId: user.id,
                name: userSeed.name,
                age: profile.age,
                gender: profile.gender,
                phone: userSeed.phone,
                address: profile.address,
                medicalHistory: `Blood group: ${profile.bloodGroup}. ${profile.medicalHistory}`,
              },
              update: {
                hospitalId,
                name: userSeed.name,
                age: profile.age,
                gender: profile.gender,
                phone: userSeed.phone,
                address: profile.address,
                medicalHistory: `Blood group: ${profile.bloodGroup}. ${profile.medicalHistory}`,
              },
            });
            break;
        }
      }

      const doctors = await Promise.all(
        ['doctor.cardio@hospital.com', 'doctor.neuro@hospital.com'].map(
          (email) =>
            tx.doctor.findUniqueOrThrow({
              where: { userId: seededUsers.get(email)!.id },
              select: { id: true, userId: true },
            }),
        ),
      );
      const nurses = [
        seededUsers.get('nurse.sarah@hospital.com')!,
        seededUsers.get('nurse.john@hospital.com')!,
      ];
      const patients = await Promise.all(
        Array.from({ length: 10 }, (_, index) =>
          tx.patient.findUniqueOrThrow({
            where: {
              userId: seededUsers.get(`patient${index + 1}@gmail.com`)!.id,
            },
            select: { id: true, userId: true },
          }),
        ),
      );

      const medicines = new Map<string, string>();
      for (const [name, description, price, stock] of medicineSeeds) {
        const id = stableId(`medicine:${name}`);
        const existing = await tx.medicine.findUnique({
          where: { name },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          throw new Error(
            `Refusing to overwrite existing inventory item "${name}"; resolve the name collision before seeding`,
          );
        }
        const medicine = await tx.medicine.upsert({
          where: { name },
          create: { id, hospitalId, name, description, price, stock },
          update: { hospitalId, description, price, stock },
          select: { id: true },
        });
        medicines.set(name, medicine.id);
      }

      for (const [index, patient] of patients.entries()) {
        const status = statusForPatient(index);
        const doctor = doctors[index % doctors.length]!;
        const appointmentId = stableId(`appointment:${index + 1}`);
        await tx.appointment.upsert({
          where: { id: appointmentId },
          create: {
            id: appointmentId,
            hospitalId,
            patientId: patient.id,
            doctorId: doctor.id,
            appointmentDate: appointmentTime(index, status, now),
            status,
            symptoms: [
              'Intermittent chest discomfort',
              'Blood pressure follow-up',
              'Palpitations and fatigue',
              'Recurring headache',
              'Numbness and tingling',
              'Medication review',
              'Routine follow-up',
              'Dizziness evaluation',
              'Preventive consultation',
              'Neurology follow-up',
            ][index],
            notes: 'Synthetic dashboard demonstration appointment.',
          },
          update: {
            hospitalId,
            patientId: patient.id,
            doctorId: doctor.id,
            appointmentDate: appointmentTime(index, status, now),
            status,
            notes: 'Synthetic dashboard demonstration appointment.',
          },
        });

        if (index < 5) {
          const minuteOffset = (index + 1) * 12;
          await tx.vitalSign.upsert({
            where: { id: stableId(`vital:${index + 1}`) },
            create: {
              id: stableId(`vital:${index + 1}`),
              patientId: patient.id,
              nurseUserId: nurses[index % nurses.length]!.id,
              systolicBloodPressure: 112 + index * 3,
              diastolicBloodPressure: 70 + index * 2,
              oxygenSaturation: 96 + (index % 4),
              heartRate: 68 + index * 3,
              temperatureCelsius: 36.6 + (index % 3) * 0.1,
              bloodGlucoseMgDl: 88 + index * 5,
              recordedAt: new Date(now.getTime() - minuteOffset * 60_000),
            },
            update: {
              patientId: patient.id,
              nurseUserId: nurses[index % nurses.length]!.id,
              systolicBloodPressure: 112 + index * 3,
              diastolicBloodPressure: 70 + index * 2,
              oxygenSaturation: 96 + (index % 4),
              heartRate: 68 + index * 3,
              temperatureCelsius: 36.6 + (index % 3) * 0.1,
              bloodGlucoseMgDl: 88 + index * 5,
              recordedAt: new Date(now.getTime() - minuteOffset * 60_000),
            },
          });
        }

        const consultationFee = 85 + (index % 3) * 10;
        const labFee = index % 2 === 0 ? 45 : 0;
        const medicationName =
          medicineSeeds[(index + 1) % medicineSeeds.length]![0];
        const medicationPrice =
          medicineSeeds[(index + 1) % medicineSeeds.length]![2] * 10;
        const billingItems = [
          {
            id: stableId(`billing-item:${index + 1}:consultation`),
            description: 'Consultation Fee',
            quantity: 1,
            unitPrice: consultationFee,
            totalPrice: consultationFee,
            medicineId: null,
          },
          {
            id: stableId(`billing-item:${index + 1}:lab`),
            description: 'Laboratory Panel',
            quantity: 1,
            unitPrice: labFee,
            totalPrice: labFee,
            medicineId: null,
          },
          {
            id: stableId(`billing-item:${index + 1}:medication`),
            description: `Medication: ${medicationName}`,
            quantity: 10,
            unitPrice: medicationPrice / 10,
            totalPrice: medicationPrice,
            medicineId: medicines.get(medicationName)!,
          },
        ].filter((item) => item.totalPrice > 0);
        const totalAmount = Number(
          billingItems
            .reduce((sum, item) => sum + item.totalPrice, 0)
            .toFixed(2),
        );
        const paymentState = index % 3;
        const paidAmount =
          paymentState === 0
            ? totalAmount
            : paymentState === 1
              ? 0
              : totalAmount / 2;
        const billingId = stableId(`billing:${index + 1}`);
        await tx.billing.upsert({
          where: { id: billingId },
          create: {
            id: billingId,
            hospitalId,
            patientId: patient.id,
            totalAmount,
            paidAmount,
            status:
              paidAmount === totalAmount
                ? BillingStatus.PAID
                : BillingStatus.PENDING,
            items: { create: billingItems },
          },
          update: {
            hospitalId,
            patientId: patient.id,
            totalAmount,
            paidAmount,
            status:
              paidAmount === totalAmount
                ? BillingStatus.PAID
                : BillingStatus.PENDING,
            items: {
              upsert: billingItems.map((item) => ({
                where: { id: item.id },
                create: item,
                update: item,
              })),
            },
          },
        });

        if (status === AppointmentStatus.COMPLETED) {
          const prescriptionId = stableId(`prescription:${index + 1}`);
          await tx.prescription.upsert({
            where: { id: prescriptionId },
            create: {
              id: prescriptionId,
              patientId: patient.id,
              doctorId: doctor.id,
              diagnosis: [
                'Essential hypertension',
                'Migraine without aura',
                'Type 2 diabetes mellitus',
                'Osteoarthritis',
                'Dyslipidemia',
              ][index - 5]!,
              instructions:
                'Synthetic demonstration prescription. Follow clinician instructions.',
              createdAt: appointmentTime(index, status, now),
            },
            update: {
              patientId: patient.id,
              doctorId: doctor.id,
              instructions:
                'Synthetic demonstration prescription. Follow clinician instructions.',
            },
          });

          const medicationIndices = [
            index % medicineSeeds.length,
            (index + 7) % medicineSeeds.length,
          ];
          for (const [
            itemIndex,
            medicineIndex,
          ] of medicationIndices.entries()) {
            const medicineName = medicineSeeds[medicineIndex]![0];
            const itemId = stableId(
              `prescription-item:${index + 1}:${itemIndex + 1}`,
            );
            await tx.prescriptionItem.upsert({
              where: { id: itemId },
              create: {
                id: itemId,
                prescriptionId,
                medicineId: medicines.get(medicineName)!,
                dosage:
                  itemIndex === 0
                    ? '1 tablet twice daily'
                    : '1 tablet once daily',
                quantity: itemIndex === 0 ? 14 : 7,
              },
              update: {
                prescriptionId,
                medicineId: medicines.get(medicineName)!,
                dosage:
                  itemIndex === 0
                    ? '1 tablet twice daily'
                    : '1 tablet once daily',
                quantity: itemIndex === 0 ? 14 : 7,
              },
            });
            const administrationId = stableId(
              `administration:${index + 1}:${itemIndex + 1}`,
            );
            await tx.medicationAdministration.upsert({
              where: { id: administrationId },
              create: {
                id: administrationId,
                prescriptionItemId: itemId,
                nurseUserId: nurses[(index + itemIndex) % nurses.length]!.id,
                notes: 'Synthetic completed medication administration record.',
                administeredAt: appointmentTime(index, status, now),
              },
              update: {
                prescriptionItemId: itemId,
                nurseUserId: nurses[(index + itemIndex) % nurses.length]!.id,
                notes: 'Synthetic completed medication administration record.',
                administeredAt: appointmentTime(index, status, now),
              },
            });
          }
        }
      }
    },
    { maxWait: 15_000, timeout: 120_000 },
  );

  const rows = users.map((user) => [
    user.role,
    user.email,
    password,
    dashboardFor(user.role),
  ]);
  const headers = ['Role', 'Email', 'Default password', 'Dashboard URL'];
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]!.length)),
  );
  const formatRow = (row: string[]) =>
    `| ${row.map((cell, index) => cell.padEnd(widths[index]!)).join(' | ')} |`;
  console.log(
    '\nSeed completed successfully. These are synthetic demo accounts; do not use this shared password in production.\n',
  );
  console.log(formatRow(headers));
  console.log(`|-${widths.map((width) => '-'.repeat(width)).join('-|-')}-|`);
  for (const row of rows) console.log(formatRow(row));
}

try {
  await seed();
} catch (error) {
  console.error('Prisma seed failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
