BEGIN;

LOCK TABLE "PlanPrice" IN SHARE ROW EXCLUSIVE MODE;

WITH proposals(slug, interval, amount) AS (
  VALUES
    ('esencial', 'MONTHLY', 29900), ('esencial', 'ANNUAL', 299000),
    ('profesional', 'MONTHLY', 49900), ('profesional', 'ANNUAL', 499000),
    ('empresarial', 'MONTHLY', 89900), ('empresarial', 'ANNUAL', 899000)
), inserted AS (
  INSERT INTO "PlanPrice" (
    "id", "planId", "version", "billingInterval", "amountCents", "publicationStatus"
  )
  SELECT 'proposal-20261126-' || proposal.slug || '-' || lower(proposal.interval),
         plan."id",
         COALESCE((SELECT max(price."version") FROM "PlanPrice" price
                   WHERE price."planId" = plan."id"
                     AND price."billingInterval" = proposal.interval::"BillingInterval"), 0) + 1,
         proposal.interval::"BillingInterval", proposal.amount, 'DRAFT'
  FROM proposals proposal
  JOIN "Plan" plan ON plan."slug" = proposal.slug AND plan."deletedAt" IS NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM "PlanPrice" existing
    WHERE existing."planId" = plan."id"
      AND existing."billingInterval" = proposal.interval::"BillingInterval"
      AND existing."amountCents" = proposal.amount
      AND existing."publicationStatus" = 'DRAFT'
  )
  ON CONFLICT ("id") DO NOTHING
  RETURNING "id", "amountCents"
)
INSERT INTO "PlanPriceHistory" ("id", "planPriceId", "amountCents", "changedBy", "reason")
SELECT "id" || '-history', "id", "amountCents", 'migration', 'commercial-price-proposal'
FROM inserted;

COMMIT;
