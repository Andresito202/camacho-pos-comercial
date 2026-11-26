-- AlterEnum: replace PENDING with PENDING_ACTIVATION
ALTER TYPE "TrialStatus" RENAME VALUE 'PENDING' TO 'PENDING_ACTIVATION';

-- New columns first
ALTER TABLE "TrialEnrollment" ADD COLUMN IF NOT EXISTS "accessTokenHash" TEXT;
ALTER TABLE "TrialEnrollment" ADD COLUMN IF NOT EXISTS "identityKey" TEXT;
ALTER TABLE "TrialEnrollment" ADD COLUMN IF NOT EXISTS "centralLicenseRef" TEXT;
ALTER TABLE "TrialEnrollment" ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
ALTER TABLE "TrialEnrollment" ADD COLUMN IF NOT EXISTS "activationSource" TEXT;

-- Deferred activation: clock fields nullable
ALTER TABLE "TrialEnrollment" ALTER COLUMN "status" SET DEFAULT 'PENDING_ACTIVATION';
ALTER TABLE "TrialEnrollment" ALTER COLUMN "startsAt" DROP NOT NULL;
ALTER TABLE "TrialEnrollment" ALTER COLUMN "startsAt" DROP DEFAULT;
ALTER TABLE "TrialEnrollment" ALTER COLUMN "expiresAt" DROP NOT NULL;

-- Reset rows that were incorrectly ACTIVE without Central confirmation
UPDATE "TrialEnrollment"
SET
  "status" = 'PENDING_ACTIVATION',
  "startsAt" = NULL,
  "expiresAt" = NULL,
  "blockedReason" = COALESCE("blockedReason", 'Clock reset: trial awaits Central license confirmation.')
WHERE "status" = 'ACTIVE'
  AND "activatedAt" IS NULL
  AND "centralLicenseRef" IS NULL;

-- Backfill hashes for legacy rows (status links rotate)
UPDATE "TrialEnrollment"
SET
  "accessTokenHash" = encode(sha256((id || '-rotated-' || COALESCE("email", ''))::bytea), 'hex'),
  "identityKey" = encode(sha256(lower(COALESCE("email", '') || '|' || COALESCE("phoneE164", ''))::bytea), 'hex')
WHERE "accessTokenHash" IS NULL OR "identityKey" IS NULL;

ALTER TABLE "TrialEnrollment" ALTER COLUMN "accessTokenHash" SET NOT NULL;
ALTER TABLE "TrialEnrollment" ALTER COLUMN "identityKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "TrialEnrollment_accessTokenHash_key" ON "TrialEnrollment"("accessTokenHash");
CREATE INDEX IF NOT EXISTS "TrialEnrollment_identityKey_idx" ON "TrialEnrollment"("identityKey");

CREATE TABLE IF NOT EXISTS "RateLimitCounter" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitCounter_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "CaptchaTokenUse" (
    "tokenHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CaptchaTokenUse_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX IF NOT EXISTS "CaptchaTokenUse_expiresAt_idx" ON "CaptchaTokenUse"("expiresAt");
