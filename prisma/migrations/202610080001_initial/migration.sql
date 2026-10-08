-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
-- Bounds enforce the current SELLin ID, sequence, quantity, and integer-money rules.
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateTable
CREATE TABLE "Owner" (
    "id" TEXT NOT NULL DEFAULT 'owner',
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCounter" (
    "id" TEXT NOT NULL DEFAULT 'customer',
    "lastCode" INTEGER NOT NULL DEFAULT 4100,

    CONSTRAINT "CustomerCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(500) NOT NULL DEFAULT '',
    "city" VARCHAR(100) NOT NULL DEFAULT '',
    "contact" VARCHAR(150) NOT NULL DEFAULT '',
    "notes" VARCHAR(1000) NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceSequence" (
    "customerId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("customerId","year")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "number" VARCHAR(16) NOT NULL,
    "customerId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "issuedAt" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "customerCode" VARCHAR(4) NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "customerAddress" VARCHAR(700) NOT NULL,
    "customerContact" VARCHAR(150) NOT NULL,
    "subtotal" DECIMAL(20,0) NOT NULL,
    "total" DECIMAL(20,0) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "device" VARCHAR(150) NOT NULL DEFAULT '',
    "description" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(20,0) NOT NULL,
    "lineTotal" DECIMAL(20,0) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL DEFAULT 'business',
    "name" VARCHAR(100) NOT NULL DEFAULT '',
    "email" VARCHAR(150) NOT NULL DEFAULT '',
    "address" VARCHAR(500) NOT NULL DEFAULT '',
    "phone" VARCHAR(40) NOT NULL DEFAULT '',
    "bankName" VARCHAR(80) NOT NULL DEFAULT '',
    "accountName" VARCHAR(150) NOT NULL DEFAULT '',
    "accountNumber" VARCHAR(60) NOT NULL DEFAULT '',
    "invoiceAuthor" VARCHAR(150) NOT NULL DEFAULT '',
    "logoKey" TEXT,
    "signatureKey" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Owner_email_key" ON "Owner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_name_idx" ON "Customer"("deletedAt", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_deletedAt_status_issuedAt_idx" ON "Invoice"("deletedAt", "status", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_customerId_year_sequence_key" ON "Invoice"("customerId", "year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_invoiceId_position_key" ON "InvoiceItem"("invoiceId", "position");

-- AddForeignKey
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional database-level constraints (maintained in SQL migrations).
ALTER TABLE "Owner" ADD CONSTRAINT "Owner_singleton" CHECK ("id" = 'owner');
ALTER TABLE "BusinessSettings" ADD CONSTRAINT "BusinessSettings_singleton" CHECK ("id" = 'business');
ALTER TABLE "CustomerCounter" ADD CONSTRAINT "CustomerCounter_bounds" CHECK ("id" = 'customer' AND "lastCode" BETWEEN 4100 AND 4199);
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_code_format" CHECK ("code" ~ '^41(0[1-9]|[1-9][0-9])$');
ALTER TABLE "InvoiceSequence" ADD CONSTRAINT "InvoiceSequence_bounds" CHECK ("year" BETWEEN 2000 AND 2099 AND "lastNumber" BETWEEN 0 AND 99999);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_bounds" CHECK ("year" BETWEEN 2000 AND 2099 AND "sequence" BETWEEN 1 AND 99999 AND "subtotal" >= 0 AND "total" = "subtotal");
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_number_format" CHECK ("number" = 'INV' || right("year"::text, 2) || "customerCode" || lpad("sequence"::text, 5, '0'));
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_values" CHECK ("position" >= 0 AND "quantity" BETWEEN 1 AND 100000 AND "unitPrice" BETWEEN 0 AND 100000000000 AND "lineTotal" = "quantity" * "unitPrice");
