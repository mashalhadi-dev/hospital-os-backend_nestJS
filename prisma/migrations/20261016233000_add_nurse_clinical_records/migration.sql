CREATE TABLE "VitalSign" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "nurseUserId" TEXT NOT NULL,
    "systolicBloodPressure" INTEGER NOT NULL,
    "diastolicBloodPressure" INTEGER NOT NULL,
    "oxygenSaturation" INTEGER NOT NULL,
    "heartRate" INTEGER NOT NULL,
    "temperatureCelsius" DOUBLE PRECISION NOT NULL,
    "bloodGlucoseMgDl" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitalSign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MedicationAdministration" (
    "id" TEXT NOT NULL,
    "prescriptionItemId" TEXT NOT NULL,
    "nurseUserId" TEXT NOT NULL,
    "notes" TEXT,
    "administeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicationAdministration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VitalSign_patientId_recordedAt_idx"
ON "VitalSign"("patientId", "recordedAt");

CREATE INDEX "VitalSign_nurseUserId_recordedAt_idx"
ON "VitalSign"("nurseUserId", "recordedAt");

CREATE INDEX "MedicationAdministration_prescriptionItemId_administeredAt_idx"
ON "MedicationAdministration"("prescriptionItemId", "administeredAt");

CREATE INDEX "MedicationAdministration_nurseUserId_administeredAt_idx"
ON "MedicationAdministration"("nurseUserId", "administeredAt");

ALTER TABLE "VitalSign"
ADD CONSTRAINT "VitalSign_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VitalSign"
ADD CONSTRAINT "VitalSign_nurseUserId_fkey"
FOREIGN KEY ("nurseUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationAdministration"
ADD CONSTRAINT "MedicationAdministration_prescriptionItemId_fkey"
FOREIGN KEY ("prescriptionItemId") REFERENCES "PrescriptionItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MedicationAdministration"
ADD CONSTRAINT "MedicationAdministration_nurseUserId_fkey"
FOREIGN KEY ("nurseUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
