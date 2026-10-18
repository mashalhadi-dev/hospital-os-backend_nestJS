CREATE TABLE "Hospital" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Hospital_slug_key" ON "Hospital"("slug");
INSERT INTO "Hospital" ("id", "name", "slug", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'City Care General Hospital', 'city-care-general', CURRENT_TIMESTAMP);

ALTER TABLE "User" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Doctor" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Nurse" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Billing" ADD COLUMN "hospitalId" TEXT;
ALTER TABLE "Medicine" ADD COLUMN "hospitalId" TEXT;

UPDATE "User" SET "hospitalId" = '00000000-0000-4000-8000-000000000001';
UPDATE "Patient" SET "hospitalId" = '00000000-0000-4000-8000-000000000001';
UPDATE "Doctor" SET "hospitalId" = '00000000-0000-4000-8000-000000000001';
UPDATE "Nurse" SET "hospitalId" = '00000000-0000-4000-8000-000000000001';
UPDATE "Appointment" SET "hospitalId" = '00000000-0000-4000-8000-000000000001';
UPDATE "Billing" SET "hospitalId" = '00000000-0000-4000-8000-000000000001';
UPDATE "Medicine" SET "hospitalId" = '00000000-0000-4000-8000-000000000001';

ALTER TABLE "User" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Patient" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Doctor" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Nurse" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Billing" ALTER COLUMN "hospitalId" SET NOT NULL;
ALTER TABLE "Medicine" ALTER COLUMN "hospitalId" SET NOT NULL;

ALTER TABLE "User" ADD CONSTRAINT "User_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Nurse" ADD CONSTRAINT "Nurse_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "User_hospitalId_idx" ON "User"("hospitalId");
CREATE INDEX "Patient_hospitalId_idx" ON "Patient"("hospitalId");
CREATE INDEX "Doctor_hospitalId_idx" ON "Doctor"("hospitalId");
CREATE INDEX "Nurse_hospitalId_idx" ON "Nurse"("hospitalId");
CREATE INDEX "Appointment_hospitalId_idx" ON "Appointment"("hospitalId");
CREATE INDEX "Billing_hospitalId_idx" ON "Billing"("hospitalId");
CREATE INDEX "Medicine_hospitalId_idx" ON "Medicine"("hospitalId");
