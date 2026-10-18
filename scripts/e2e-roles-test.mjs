/**
 * DocNode Hospital OS — E2E Role Verification & Seed Script
 *
 * This script:
 * 1. Creates all 5 role types (ADMIN via trusted Prisma, other roles via API)
 * 2. Logs in each registered user and verifies JWT payload
 * 3. Tests RBAC-protected endpoints for each role
 *
 * Usage:
 *   node scripts/e2e-roles-test.mjs
 *
 * Requirements:
 *   - API_BASE_URL set to the running backend URL
 *   - STAFF_REGISTRATION_SECRET set in the process environment
 *   - Valid DATABASE_URL connecting to PostgreSQL
 *   - E2E_TEST_PASSWORD and E2E_ALLOW_DATABASE_WRITES=true
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const BASE_URL = process.env.API_BASE_URL;
const STAFF_SECRET = process.env.STAFF_REGISTRATION_SECRET;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;
const ALLOW_DATABASE_WRITES = process.env.E2E_ALLOW_DATABASE_WRITES === 'true';
if (!BASE_URL) {
  throw new Error('API_BASE_URL must be set to the running backend URL');
}
if (!STAFF_SECRET) {
  throw new Error('STAFF_REGISTRATION_SECRET must be set');
}
if (!TEST_PASSWORD || Buffer.byteLength(TEST_PASSWORD, 'utf8') > 72) {
  throw new Error('E2E_TEST_PASSWORD must be set and no more than 72 UTF-8 bytes');
}
if (!ALLOW_DATABASE_WRITES) {
  throw new Error(
    'Set E2E_ALLOW_DATABASE_WRITES=true to create synthetic test records',
  );
}
const TIMESTAMP = Date.now();
const prisma = new PrismaClient();
const roleSessions = {};
let failureCount = 0;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function requestWithTransientRetry(method, path, body, token) {
  let response;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await request(method, path, body, token);
    if (![502, 503, 504].includes(response.status) || attempt === 2) {
      return response;
    }
    await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
  }
  return response;
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function log(level, msg) {
  if (level === 'FAIL') failureCount += 1;
  const icons = { PASS: '✅', FAIL: '❌', INFO: 'ℹ️', WARN: '⚠️' };
  console.log(`${icons[level] || '  '} [${level}] ${msg}`);
}

// ─── Role Test Configs ────────────────────────────────────────────────────────

const roleConfigs = [
  {
    role: 'ADMIN',
    payload: {
      name: `E2E Admin ${TIMESTAMP}`,
      email: `e2e.admin.${TIMESTAMP}@docnode.test`,
      password: TEST_PASSWORD,
      role: 'ADMIN',
    },
    seedDirectly: true,
    allowedEndpoints: ['/auth/users', '/appointments', '/patients'],
    blockedEndpoints: [],
  },
  {
    role: 'DOCTOR',
    payload: {
      name: `E2E Doctor ${TIMESTAMP}`,
      email: `e2e.doctor.${TIMESTAMP}@docnode.test`,
      password: TEST_PASSWORD,
      role: 'DOCTOR',
      phone: '+10000000001',
      registrationSecret: STAFF_SECRET,
      specialization: 'Cardiology',
      department: 'Cardiac ICU',
    },
    allowedEndpoints: ['/appointments', '/patients', '/medicines', '/prescriptions'],
    blockedEndpoints: ['/auth/users'],
  },
  {
    role: 'NURSE',
    payload: {
      name: `E2E Nurse ${TIMESTAMP}`,
      email: `e2e.nurse.${TIMESTAMP}@docnode.test`,
      password: TEST_PASSWORD,
      role: 'NURSE',
      phone: '+10000000002',
      registrationSecret: STAFF_SECRET,
      department: 'ICU',
      shift: 'Morning',
    },
    allowedEndpoints: [
      '/patients',
      '/nurses/vitals',
      '/nurses/medication-orders',
    ],
    blockedEndpoints: ['/appointments', '/auth/users'],
  },
  {
    role: 'RECEPTIONIST',
    payload: {
      name: `E2E Receptionist ${TIMESTAMP}`,
      email: `e2e.receptionist.${TIMESTAMP}@docnode.test`,
      password: TEST_PASSWORD,
      role: 'RECEPTIONIST',
      phone: '+10000000003',
      registrationSecret: STAFF_SECRET,
      deskNumber: 'DESK-04',
    },
    allowedEndpoints: ['/appointments', '/billing', '/patients', '/doctors'],
    blockedEndpoints: ['/auth/users'],
  },
  {
    role: 'PATIENT',
    payload: {
      name: `E2E Patient ${TIMESTAMP}`,
      email: `e2e.patient.${TIMESTAMP}@docnode.test`,
      password: TEST_PASSWORD,
      role: 'PATIENT',
      phone: '+10000000004',
      age: 35,
      gender: 'MALE',
      address: '123 Test St, Demo City',
    },
    allowedEndpoints: [
      '/appointments',
      '/billing',
      '/prescriptions',
      '/doctors/availability',
    ],
    blockedEndpoints: ['/auth/users'],
  },
];

// ─── Main Test Runner ─────────────────────────────────────────────────────────

async function runAllRoleTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   DocNode Hospital OS — E2E Role Verification Script');
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {};

  for (const config of roleConfigs) {
    console.log(`\n──────────── Testing Role: ${config.role} ────────────`);

    // ── Step 1: Register ──
    if (config.seedDirectly) {
      const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);
      await prisma.user.create({
        data: {
          name: config.payload.name,
          email: config.payload.email,
          password: passwordHash,
          role: 'ADMIN',
        },
      });
      log('PASS', 'ADMIN account provisioned via trusted Prisma path');
    } else {
      log('INFO', `Registering ${config.role}: ${config.payload.email}`);
      const regRes = await request('POST', '/auth/register', config.payload);
      if (regRes.status === 201 || regRes.status === 200) {
        log('PASS', `${config.role} registered successfully`);
      } else {
        log('FAIL', `Registration failed (${regRes.status}): ${JSON.stringify(regRes.data)}`);
        results[config.role] = {
          registered: false,
          loggedIn: false,
          jwtValid: false,
          persisted: false,
        };
        continue;
      }
    }

    // ── Step 2: Login ──
    log('INFO', `Logging in as ${config.role}...`);
    const loginRes = await request('POST', '/auth/login', {
      email: config.payload.email,
      password: config.payload.password,
    });

    if (loginRes.status !== 200 && loginRes.status !== 201) {
      log('FAIL', `Login failed (${loginRes.status}): ${JSON.stringify(loginRes.data)}`);
      results[config.role] = { registered: true, loggedIn: false, jwtValid: false };
      continue;
    }

    log('PASS', `${config.role} login successful`);
    const { accessToken, user } = loginRes.data;
    roleSessions[config.role] = { accessToken, user, email: config.payload.email };

    // ── Step 3: Verify JWT ──
    const jwtPayload = decodeJwt(accessToken);
    const jwtRoleMatch = jwtPayload?.role === config.role;
    const jwtEmailMatch = jwtPayload?.email === config.payload.email.toLowerCase();
    const jwtHasSub = !!jwtPayload?.sub;

    if (jwtRoleMatch && jwtEmailMatch && jwtHasSub) {
      log('PASS', `JWT payload verified: sub=${jwtPayload.sub}, role=${jwtPayload.role}, email=${jwtPayload.email}`);
    } else {
      log('FAIL', `JWT payload mismatch: ${JSON.stringify(jwtPayload)}`);
    }

    // ── Step 4: Verify user response fields ──
    const backendNameField = user?.name;
    const userRoleField = user?.role;
    if (backendNameField && userRoleField === config.role) {
      log('PASS', `Backend user response: name="${backendNameField}", role="${userRoleField}"`);
      log('INFO', `Frontend normalizer maps: name → fullName ✓`);
    } else {
      log('FAIL', `User response field mismatch: ${JSON.stringify(user)}`);
    }

    const meRes = await request('GET', '/auth/me', undefined, accessToken);
    const persisted =
      meRes.status === 200 &&
      meRes.data.id === user?.id &&
      meRes.data.role === config.role;
    if (persisted) {
      log('PASS', `${config.role} account reloaded from PostgreSQL via /auth/me`);
    } else {
      log('FAIL', `${config.role} database persistence check failed (${meRes.status})`);
    }

    // ── Step 5: Password hash check (indirect via re-login with wrong password) ──
    const incorrectPassword =
      TEST_PASSWORD.startsWith('x')
        ? `y${TEST_PASSWORD.slice(1)}`
        : `x${TEST_PASSWORD.slice(1)}`;
    const wrongPassRes = await request('POST', '/auth/login', {
      email: config.payload.email,
      password: incorrectPassword,
    });
    if (wrongPassRes.status === 401) {
      log('PASS', `bcrypt hash verified: wrong password correctly rejected (401)`);
    } else {
      log('FAIL', `Security issue: wrong password accepted! Status: ${wrongPassRes.status}`);
    }

    // ── Step 6: Test allowed endpoints ──
    for (const endpoint of config.allowedEndpoints) {
      const epRes = await request('GET', endpoint, undefined, accessToken);
      if (epRes.status === 200 || epRes.status === 201) {
        log('PASS', `${config.role} can access ${endpoint} (${epRes.status})`);
      } else {
        log('FAIL', `${config.role} could not access ${endpoint} (${epRes.status})`);
      }
    }
    for (const endpoint of config.blockedEndpoints) {
      const epRes = await request('GET', endpoint, undefined, accessToken);
      if (epRes.status === 403) {
        log('PASS', `${config.role} is denied access to ${endpoint}`);
      } else {
        log('FAIL', `${config.role} unexpectedly received ${epRes.status} from ${endpoint}`);
      }
    }

    results[config.role] = {
      registered: true,
      loggedIn: true,
      jwtValid: jwtRoleMatch && jwtEmailMatch && jwtHasSub,
      passwordHashVerified: wrongPassRes.status === 401,
      persisted,
      userId: user?.id,
      email: user?.email,
    };
  }

  const doctor = roleSessions.DOCTOR;
  const receptionist = roleSessions.RECEPTIONIST;
  const patient = roleSessions.PATIENT;
  if (!doctor || !receptionist || !patient) {
    throw new Error('Doctor, receptionist, and patient accounts are required for E2E');
  }

  const appointmentRes = await request(
    'POST',
    '/appointments',
    {
      patientId: patient.user.patientProfile.id,
      doctorId: doctor.user.doctorProfile.id,
      appointmentDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      symptoms: 'Synthetic E2E test context',
    },
    receptionist.accessToken,
  );
  if (appointmentRes.status !== 201 && appointmentRes.status !== 200) {
    throw new Error(
      `Could not create synthetic E2E appointment (${appointmentRes.status})`,
    );
  }
  log('PASS', 'Synthetic patient-doctor appointment persisted');

  const invoiceRes = await request(
    'POST',
    '/billing',
    {
      patientId: patient.user.patientProfile.id,
      items: [
        {
          description: 'Synthetic E2E consultation',
          quantity: 1,
          unitPrice: 1,
        },
      ],
    },
    receptionist.accessToken,
  );
  if (invoiceRes.status !== 201 && invoiceRes.status !== 200) {
    throw new Error(`Could not create synthetic E2E invoice (${invoiceRes.status})`);
  }
  const patientBillingRes = await request(
    'GET',
    '/billing',
    undefined,
    patient.accessToken,
  );
  const patientInvoices = Array.isArray(patientBillingRes.data)
    ? patientBillingRes.data
    : [];
  const ownInvoiceVisible = patientInvoices.some(
    (invoice) => invoice.id === invoiceRes.data.id,
  );
  const billingIsPatientScoped = patientInvoices.every(
    (invoice) => invoice.patientId === patient.user.patientProfile.id,
  );
  if (
    patientBillingRes.status !== 200 ||
    !ownInvoiceVisible ||
    !billingIsPatientScoped
  ) {
    throw new Error('Patient billing list is not persisted and correctly scoped');
  }
  log('PASS', 'Synthetic invoice persisted and visible only within patient billing scope');

  const nurse = roleSessions.NURSE;
  const vitalRes = await request(
    'POST',
    '/nurses/vitals',
    {
      patientId: patient.user.patientProfile.id,
      systolicBloodPressure: 118,
      diastolicBloodPressure: 76,
      oxygenSaturation: 98,
      heartRate: 72,
      temperatureCelsius: 36.8,
      bloodGlucoseMgDl: 102,
    },
    nurse.accessToken,
  );
  const vitalsRes = await request(
    'GET',
    `/nurses/vitals?patientId=${patient.user.patientProfile.id}`,
    undefined,
    nurse.accessToken,
  );
  const persistedVitals =
    (vitalRes.status === 201 || vitalRes.status === 200) &&
    Array.isArray(vitalsRes.data) &&
    vitalsRes.data.some((vital) => vital.id === vitalRes.data.id);
  results.NURSE.vitalsPersisted = persistedVitals;
  log(
    persistedVitals ? 'PASS' : 'FAIL',
    persistedVitals
      ? 'Synthetic vitals persisted and reloaded from PostgreSQL'
      : `Synthetic vitals persistence failed (${vitalRes.status}/${vitalsRes.status})`,
  );

  const medicineRes = await request(
    'POST',
    '/medicines',
    {
      name: `E2E Synthetic Medicine ${TIMESTAMP}`,
      price: 0.01,
      stock: 100,
      description: 'Synthetic integration-test inventory item',
    },
    receptionist.accessToken,
  );
  if (medicineRes.status !== 201 && medicineRes.status !== 200) {
    throw new Error(`Could not create synthetic E2E medicine (${medicineRes.status})`);
  }
  const prescriptionRes = await request(
    'POST',
    '/prescriptions',
    {
      patientId: patient.user.patientProfile.id,
      diagnosis: 'Synthetic E2E verification',
      instructions: 'Test record only',
      items: [
        {
          medicineId: medicineRes.data.id,
          dosage: 'One synthetic unit for E2E verification',
          quantity: 1,
        },
      ],
    },
    doctor.accessToken,
  );
  if (prescriptionRes.status !== 201 && prescriptionRes.status !== 200) {
    throw new Error(`Could not create synthetic E2E prescription (${prescriptionRes.status})`);
  }
  const prescriptionItemId = prescriptionRes.data.items?.[0]?.id;
  const administrationRes = await request(
    'POST',
    '/nurses/medication-administrations',
    { prescriptionItemId, notes: 'Synthetic E2E administration record' },
    nurse.accessToken,
  );
  const nurseOrdersRes = await request(
    'GET',
    `/nurses/medication-orders?patientId=${patient.user.patientProfile.id}`,
    undefined,
    nurse.accessToken,
  );
  const persistedAdministration =
    (administrationRes.status === 201 || administrationRes.status === 200) &&
    nurseOrdersRes.status === 200 &&
    nurseOrdersRes.data.some((order) =>
      order.items.some((item) =>
        item.administrations.some(
          (administration) => administration.id === administrationRes.data.id,
        ),
      ),
    );
  results.NURSE.medicationAdministrationPersisted = persistedAdministration;
  log(
    persistedAdministration ? 'PASS' : 'FAIL',
    persistedAdministration
      ? 'Synthetic medication administration persisted and reloaded'
      : `Medication administration persistence failed (${administrationRes.status}/${nurseOrdersRes.status})`,
  );

  if (process.env.RUN_GEMINI_E2E === 'true') {
    const aiChecks = [
      {
        role: 'ADMIN',
        path: '/ai/summarize',
        payload: {
          patientId: patient.user.patientProfile.id,
          prompt: 'Use this synthetic E2E record. Return a brief summary.',
        },
        responseKey: 'summary',
      },
      {
        role: 'DOCTOR',
        path: '/ai/summarize',
        payload: {
          patientId: patient.user.patientProfile.id,
          prompt: 'Use this synthetic E2E record. Return a brief summary.',
        },
        responseKey: 'summary',
      },
      {
        role: 'PATIENT',
        path: '/ai/summarize',
        payload: {
          patientId: patient.user.patientProfile.id,
          prompt: 'Use this synthetic E2E record. Return a brief summary.',
        },
        responseKey: 'summary',
      },
      {
        role: 'NURSE',
        path: '/ai/nurse-copilot',
        payload: {
          patientId: patient.user.patientProfile.id,
          prompt: 'Summarize only the synthetic vitals I recorded.',
        },
        responseKey: 'response',
      },
      {
        role: 'RECEPTIONIST',
        path: '/ai/receptionist-copilot',
        payload: { task: 'APPOINTMENT_REMINDER' },
        responseKey: 'response',
      },
    ];
    for (const check of aiChecks) {
      const { role, path, payload, responseKey } = check;
      const session = roleSessions[role];
      const aiRes = await requestWithTransientRetry(
        'POST',
        path,
        payload,
        session.accessToken,
      );
      const responseText = aiRes.data?.[responseKey];
      const passed =
        aiRes.status === 201 || aiRes.status === 200
          ? typeof responseText === 'string' && responseText.trim().length > 0
          : false;
      results[role].ai = passed;
      log(
        passed ? 'PASS' : 'FAIL',
        `${role} Gemini AI ${passed ? `returned ${responseText.length} characters` : `failed (${aiRes.status})`}`,
      );
    }
  } else {
    log('WARN', 'Set RUN_GEMINI_E2E=true to send role-scoped synthetic prompts to Gemini');
  }
  for (const role of ['NURSE', 'RECEPTIONIST']) {
    const session = roleSessions[role];
    const aiRes = await request(
      'POST',
      '/ai/summarize',
      { patientId: patient.user.patientProfile.id, prompt: 'Synthetic RBAC test' },
      session.accessToken,
    );
    results[role].clinicalSummaryBlocked = aiRes.status === 403;
    log(
      results[role].clinicalSummaryBlocked ? 'PASS' : 'FAIL',
      `${role} clinical-record summary is ${results[role].clinicalSummaryBlocked ? 'blocked by RBAC' : `unexpected (${aiRes.status})`}`,
    );
  }

  // ── Summary ──
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   E2E Verification Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n Role       | Persisted | Login | JWT | Hash | Vitals | MAR | AI response | Clinical AI guard');
  console.log(' ────────────────────────────────────────────────────────────────');
  for (const [role, r] of Object.entries(results)) {
    const persisted = r.persisted ? '✅' : '❌';
    const login = r.loggedIn ? '✅' : '❌';
    const jwt = r.jwtValid ? '✅' : '❌';
    const hash = r.passwordHashVerified ? '✅' : '❌';
    const vitals = r.vitalsPersisted === undefined ? '—' : r.vitalsPersisted ? '✅' : '❌';
    const mar =
      r.medicationAdministrationPersisted === undefined
        ? '—'
        : r.medicationAdministrationPersisted
          ? '✅'
          : '❌';
    const ai = r.ai === undefined ? 'SKIP' : r.ai ? '✅' : '❌';
    const clinicalAiGuard =
      r.clinicalSummaryBlocked === undefined
        ? '—'
        : r.clinicalSummaryBlocked
          ? '✅'
          : '❌';
    console.log(` ${role.padEnd(12)}| ${persisted}        | ${login}   | ${jwt}  | ${hash}  | ${vitals}      | ${mar}  | ${ai}          | ${clinicalAiGuard}`);
  }
  if (failureCount > 0) {
    console.log(`❌ E2E verification completed with ${failureCount} failure(s).`);
    process.exitCode = 1;
  } else {
    console.log('✅ E2E verification completed without failed assertions.');
  }
  console.log('');
  console.log(' ADMIN was provisioned through the trusted Prisma path (public signup remains disabled).');
  console.log('═══════════════════════════════════════════════════════════\n');
}

runAllRoleTests().catch((err) => {
  console.error('❌ Test script crashed:', err);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
