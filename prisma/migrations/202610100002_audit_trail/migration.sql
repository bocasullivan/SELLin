ALTER TABLE "AccountCustomer"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdByUserId" UUID,
  ADD COLUMN "updatedByUserId" UUID;

UPDATE "AccountCustomer" SET "createdByUserId" = "userId", "updatedByUserId" = "userId";
ALTER TABLE "AccountCustomer"
  ALTER COLUMN "createdByUserId" SET NOT NULL,
  ALTER COLUMN "updatedByUserId" SET NOT NULL;

ALTER TABLE "AccountInvoice"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdByUserId" UUID,
  ADD COLUMN "updatedByUserId" UUID;

UPDATE "AccountInvoice" SET "createdByUserId" = "userId", "updatedByUserId" = "userId";
ALTER TABLE "AccountInvoice"
  ALTER COLUMN "createdByUserId" SET NOT NULL,
  ALTER COLUMN "updatedByUserId" SET NOT NULL;

ALTER TABLE "AccountSettings"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "createdByUserId" UUID,
  ADD COLUMN "updatedByUserId" UUID,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "AccountSettings" SET "createdByUserId" = "userId", "updatedByUserId" = "userId";
ALTER TABLE "AccountSettings"
  ALTER COLUMN "createdByUserId" SET NOT NULL,
  ALTER COLUMN "updatedByUserId" SET NOT NULL;

CREATE TABLE "AuditTrail" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "userId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "entityType" VARCHAR(40) NOT NULL,
  "entityId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "action" VARCHAR(20) NOT NULL,
  "changes" JSONB NOT NULL,
  "reason" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditTrail_userId_entityType_entityId_createdAt_idx"
  ON "AuditTrail"("userId", "entityType", "entityId", "createdAt");
CREATE INDEX "AuditTrail_userId_createdAt_idx"
  ON "AuditTrail"("userId", "createdAt");
