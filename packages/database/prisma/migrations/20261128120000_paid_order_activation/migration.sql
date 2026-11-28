ALTER TABLE "BusinessProfile" ADD COLUMN "centralCompanyId" UUID;
CREATE UNIQUE INDEX "BusinessProfile_centralCompanyId_key" ON "BusinessProfile"("centralCompanyId");
ALTER TABLE "ProvisioningRequest" ADD COLUMN "activationVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "activationReceipts" JSONB;
