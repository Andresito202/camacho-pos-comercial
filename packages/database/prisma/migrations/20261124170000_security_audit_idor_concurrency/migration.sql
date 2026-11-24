-- Support ticket anti-IDOR access token
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "accessTokenHash" TEXT;

UPDATE "SupportTicket"
SET "accessTokenHash" = encode(sha256((id || '-rotated-' || COALESCE(email, ''))::bytea), 'hex')
WHERE "accessTokenHash" IS NULL;

ALTER TABLE "SupportTicket" ALTER COLUMN "accessTokenHash" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SupportTicket_accessTokenHash_key" ON "SupportTicket"("accessTokenHash");

-- Serialize open-trial uniqueness: at most one PENDING_ACTIVATION|ACTIVE per identityKey
CREATE UNIQUE INDEX IF NOT EXISTS "TrialEnrollment_open_identity_uidx"
ON "TrialEnrollment" ("identityKey")
WHERE "deletedAt" IS NULL AND "status" IN ('PENDING_ACTIVATION', 'ACTIVE');
