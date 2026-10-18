# Graph Report - hospital os  (2026-10-17)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1013 nodes · 2169 edges · 43 communities (34 shown, 9 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- react
- AuthenticatedUser
- @nestjs/common
- MedicinesService
- AppointmentsService
- ai.service.ts
- DoctorsService
- CreatePatientDto
- healthnode-frontend/package.json
- CreateBillingDto
- ReceptionistsController
- toast-store.ts
- healthnode-backend/package.json
- compilerOptions
- vitals.ts
- dependencies
- compilerOptions
- devDependencies
- useApi.ts
- scripts
- AuthService
- api.ts
- auth.service.ts
- EnvironmentVariables
- seed.ts
- RegisterDto
- e2e-roles-test.mjs
- AuthController
- RedisService
- status.ts
- user.ts
- types/index.ts
- .oxlintrc.json
- tsconfig.build.json
- nest-cli.json
- appointments.gateway.ts
- nurse.ts
- vite-tsconfig-paths
- billing.ts
- prisma
- prisma
- bcrypt.d.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `AuthenticatedUser` - 61 edges
2. `Roles()` - 57 edges
3. `@nestjs/common` - 43 edges
4. `@prisma/client` - 35 edges
5. `react` - 29 edges
6. `cn()` - 22 edges
7. `FrostedGlassCard` - 22 edges
8. `PillButton` - 22 edges
9. `PillTag` - 22 edges
10. `lucide-react` - 21 edges

## Surprising Connections (you probably didn't know these)
- `RegisterDto` --references--> `UserRole`  [EXTRACTED]
  healthnode-frontend/src/types/auth.ts → healthnode-frontend/src/types/user.ts
- `VitalBadge()` --calls--> `cn()`  [EXTRACTED]
  healthnode-frontend/src/components/ui/VitalBadge.tsx → healthnode-frontend/src/lib/utils.ts
- `AppointmentsController` --references--> `Roles()`  [EXTRACTED]
  healthnode-backend/src/appointments/appointments.controller.ts → healthnode-backend/src/common/decorators/roles.decorator.ts
- `BillingController` --references--> `Roles()`  [EXTRACTED]
  healthnode-backend/src/billing/billing.controller.ts → healthnode-backend/src/common/decorators/roles.decorator.ts
- `DoctorsController` --references--> `Roles()`  [EXTRACTED]
  healthnode-backend/src/doctors/doctors.controller.ts → healthnode-backend/src/common/decorators/roles.decorator.ts

## Import Cycles
- None detected.

## Communities (43 total, 9 thin omitted)

### Community 0 - "react"
Cohesion: 0.06
Nodes (77): nextConfig, AdminPage(), DashboardPage(), DoctorPage(), LoginPage(), NursePage(), features, Home() (+69 more)

### Community 1 - "AuthenticatedUser"
Cohesion: 0.05
Nodes (23): AuthenticatedRequest, PatientContext, patientContextSelect, nurse, AuthenticatedRequest, billingSelect, Roles(), ROLES_KEY (+15 more)

### Community 2 - "@nestjs/common"
Cohesion: 0.07
Nodes (18): AiModule, AppController, AppModule, AppService, AppointmentsModule, AuthModule, BillingModule, PrismaModule (+10 more)

### Community 3 - "MedicinesService"
Cohesion: 0.07
Nodes (7): CreateMedicineDto, UpdateMedicineDto, CreatePrescriptionDto, PrescriptionItemDto, UpdatePrescriptionDto, MedicinesController, MedicinesService

### Community 4 - "AppointmentsService"
Cohesion: 0.06
Nodes (7): AppointmentsController, AppointmentsGateway, AppointmentResult, appointmentSelect, AppointmentsService, CreateAppointmentDto, UpdateStatusDto

### Community 5 - "ai.service.ts"
Cohesion: 0.07
Nodes (14): AiController, AiService, receptionistTaskPrompts, AskAiDto, AskReceptionistAiDto, ReceptionistAiTask, APPOINTMENT_CONFIRMATION, APPOINTMENT_REMINDER (+6 more)

### Community 6 - "DoctorsService"
Cohesion: 0.06
Nodes (6): DoctorsController, DoctorResult, doctorSelect, DoctorsService, CreateDoctorDto, UpdateDoctorDto

### Community 7 - "CreatePatientDto"
Cohesion: 0.06
Nodes (4): CreatePatientDto, UpdatePatientDto, PatientsController, PatientsService

### Community 8 - "healthnode-frontend/package.json"
Cohesion: 0.05
Nodes (42): @types/node, typescript, eslintConfig, dependencies, axios, clsx, lucide-react, next (+34 more)

### Community 9 - "CreateBillingDto"
Cohesion: 0.08
Nodes (5): BillingController, BillingService, CreateBillingDto, CreateBillingItemDto, UpdateBillingDto

### Community 10 - "ReceptionistsController"
Cohesion: 0.10
Nodes (5): CreateReceptionistDto, UpdateReceptionistDto, ReceptionistsController, receptionistSelect, ReceptionistsService

### Community 11 - "toast-store.ts"
Cohesion: 0.10
Nodes (24): geistMono, geistSans, metadata, RootLayout(), viewport, AppProviders(), ThemeProvider(), ThemeScript() (+16 more)

### Community 12 - "healthnode-backend/package.json"
Cohesion: 0.07
Nodes (26): author, description, license, name, private, type, version, cache-manager (+18 more)

### Community 13 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, incremental, isolatedModules (+12 more)

### Community 14 - "vitals.ts"
Cohesion: 0.14
Nodes (19): ICONS, SR_TEXT, VitalBadge(), VitalBadgeProps, classifyDiastolic(), classifyGlucose(), classifyHeartRate(), classifySpo2() (+11 more)

### Community 15 - "dependencies"
Cohesion: 0.11
Nodes (19): dependencies, bcrypt, cache-manager, cache-manager-redis-store, class-transformer, class-validator, @google/generative-ai, ioredis (+11 more)

### Community 16 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 17 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, @nestjs/cli, @nestjs/schematics, @nestjs/testing, oxlint, oxlint-tsgolint, prettier, prisma (+9 more)

### Community 18 - "useApi.ts"
Cohesion: 0.14
Nodes (4): QueryKeys, Appointment, AppointmentStatus, CreateAppointmentDto

### Community 19 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, deploy, format, lint, start, start:debug, start:dev (+6 more)

### Community 21 - "api.ts"
Cohesion: 0.18
Nodes (10): AuthLoginPayload, axiosInstance, RegisterPayload, ReceptionistAiTask, receptionistAiTaskOptions, CreatePatientDto, Patient, CreatePrescriptionDto (+2 more)

### Community 22 - "auth.service.ts"
Cohesion: 0.19
Nodes (4): AuthUser, publicUserSelect, LoginDto, bcrypt

### Community 23 - "EnvironmentVariables"
Cohesion: 0.15
Nodes (3): EnvironmentVariables, validateEnvironment(), class-transformer

### Community 24 - "seed.ts"
Cohesion: 0.23
Nodes (10): appointmentTime(), dashboardFor(), frontendBaseUrl, medicineSeeds, prisma, seed(), stableId(), statusForPatient() (+2 more)

### Community 26 - "e2e-roles-test.mjs"
Cohesion: 0.31
Nodes (9): decodeJwt(), log(), prisma, request(), requestWithTransientRetry(), roleConfigs, roleSessions, runAllRoleTests() (+1 more)

### Community 29 - "status.ts"
Cohesion: 0.22
Nodes (4): PillTagProps, APPOINTMENT_STATUS_META, BILLING_STATUS_META, TagVariant

### Community 30 - "user.ts"
Cohesion: 0.22
Nodes (7): AuthResponse, AuthState, LoginDto, RegisterDto, AuthResponse, AuthState, User

### Community 31 - "types/index.ts"
Cohesion: 0.22
Nodes (5): CreateDoctorDto, Doctor, Medicine, CreateReceptionistDto, Receptionist

### Community 32 - ".oxlintrc.json"
Cohesion: 0.29
Nodes (6): env, node, rules, typescript/no-explicit-any, typescript/no-floating-promises, $schema

### Community 33 - "tsconfig.build.json"
Cohesion: 0.29
Nodes (6): compilerOptions, rootDir, exclude, extends, include, ./tsconfig.json

### Community 34 - "nest-cli.json"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 35 - "appointments.gateway.ts"
Cohesion: 0.33
Nodes (3): QueueUpdate, @nestjs/jwt, @nestjs/websockets

### Community 36 - "nurse.ts"
Cohesion: 0.33
Nodes (5): CreateMedicationAdministrationDto, CreateNurseDto, CreateVitalSignDto, Nurse, VitalSign

### Community 38 - "billing.ts"
Cohesion: 0.50
Nodes (3): BillingInvoice, BillingStatus, CreateBillingDto

## Knowledge Gaps
- **30 isolated node(s):** `cache-manager`, `cache-manager-redis-store`, `@nestjs/cli`, `@nestjs/observe`, `@nestjs/platform-express` (+25 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 447 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `AuthenticatedUser`, `MedicinesService`, `AppointmentsService`, `ai.service.ts`, `DoctorsService`, `ReceptionistsController`, `healthnode-backend/package.json`, `auth.service.ts`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **What connects `cache-manager`, `cache-manager-redis-store`, `@nestjs/cli` to the rest of the system?**
  _30 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.0628992628992629 - nodes in this community are weakly interconnected._
- **Why does `@types/node` connect `healthnode-frontend/package.json` to `healthnode-backend/package.json`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Should `AuthenticatedUser` be split into smaller, more focused modules?**
  _Cohesion score 0.05022404779686333 - nodes in this community are weakly interconnected._
- **Why does `typescript` connect `healthnode-frontend/package.json` to `healthnode-backend/package.json`?**
  _High betweenness centrality (0.192) - this node is a cross-community bridge._
- **Should `@nestjs/common` be split into smaller, more focused modules?**
  _Cohesion score 0.073224043715847 - nodes in this community are weakly interconnected._