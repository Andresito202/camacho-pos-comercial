ALTER TABLE "BusinessProfile" ADD COLUMN "centralTenantId" UUID;
ALTER TABLE "PlanPrice" ADD COLUMN "centralPlanId" UUID;
ALTER TABLE "ProvisioningRequest" ADD COLUMN "wirePreparedAt" TIMESTAMP(3);
