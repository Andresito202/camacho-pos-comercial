-- CreateEnum
CREATE TYPE "TrialStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CONVERTED', 'CANCELLED', 'BLOCKED');

-- CreateTable
CREATE TABLE "TrialEnrollment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "customerId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneE164" TEXT,
    "companyName" TEXT,
    "sector" TEXT,
    "city" TEXT,
    "notes" TEXT,
    "status" "TrialStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "blockedAt" TIMESTAMP(3),
    "blockedReason" TEXT,
    "consentDataTreatment" BOOLEAN NOT NULL DEFAULT false,
    "consentTerms" BOOLEAN NOT NULL DEFAULT false,
    "sourcePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TrialEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrialEnrollment_email_idx" ON "TrialEnrollment"("email");

-- CreateIndex
CREATE INDEX "TrialEnrollment_status_idx" ON "TrialEnrollment"("status");

-- CreateIndex
CREATE INDEX "TrialEnrollment_expiresAt_idx" ON "TrialEnrollment"("expiresAt");

-- AddForeignKey
ALTER TABLE "TrialEnrollment" ADD CONSTRAINT "TrialEnrollment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CommercialCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
