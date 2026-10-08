-- CreateTable
CREATE TABLE "AccountCounter" (
    "userId" UUID NOT NULL,
    "lastCode" INTEGER NOT NULL DEFAULT 4100,

    CONSTRAINT "AccountCounter_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "AccountCustomer" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(500) NOT NULL DEFAULT '',
    "city" VARCHAR(100) NOT NULL DEFAULT '',
    "contact" VARCHAR(150) NOT NULL DEFAULT '',
    "notes" VARCHAR(1000) NOT NULL DEFAULT '',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSequence" (
    "userId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AccountSequence_pkey" PRIMARY KEY ("userId","customerId","year")
);

-- CreateTable
CREATE TABLE "AccountInvoice" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "number" VARCHAR(16) NOT NULL,
    "year" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "issuedAt" DATE NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "customerCode" VARCHAR(4) NOT NULL,
    "customerName" VARCHAR(100) NOT NULL,
    "customerAddress" VARCHAR(700) NOT NULL,
    "customerContact" VARCHAR(150) NOT NULL,
    "total" DECIMAL(20,0) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountItem" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "device" VARCHAR(150) NOT NULL DEFAULT '',
    "description" VARCHAR(200) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(20,0) NOT NULL,
    "lineTotal" DECIMAL(20,0) NOT NULL,

    CONSTRAINT "AccountItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountSettings" (
    "userId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL DEFAULT '',
    "email" VARCHAR(150) NOT NULL DEFAULT '',
    "address" VARCHAR(500) NOT NULL DEFAULT '',
    "phone" VARCHAR(40) NOT NULL DEFAULT '',
    "bankName" VARCHAR(80) NOT NULL DEFAULT '',
    "accountName" VARCHAR(150) NOT NULL DEFAULT '',
    "accountNumber" VARCHAR(60) NOT NULL DEFAULT '',
    "invoiceAuthor" VARCHAR(150) NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "signature" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountCustomer_userId_code_key" ON "AccountCustomer"("userId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AccountCustomer_userId_id_key" ON "AccountCustomer"("userId", "id");

-- CreateIndex
CREATE INDEX "AccountInvoice_userId_deletedAt_issuedAt_idx" ON "AccountInvoice"("userId", "deletedAt", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountInvoice_userId_number_key" ON "AccountInvoice"("userId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "AccountInvoice_userId_customerId_year_sequence_key" ON "AccountInvoice"("userId", "customerId", "year", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "AccountItem_invoiceId_position_key" ON "AccountItem"("invoiceId", "position");

-- AddForeignKey
ALTER TABLE "AccountCounter" ADD CONSTRAINT "AccountCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountCustomer" ADD CONSTRAINT "AccountCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSequence" ADD CONSTRAINT "AccountSequence_userId_customerId_fkey" FOREIGN KEY ("userId", "customerId") REFERENCES "AccountCustomer"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvoice" ADD CONSTRAINT "AccountInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountInvoice" ADD CONSTRAINT "AccountInvoice_userId_customerId_fkey" FOREIGN KEY ("userId", "customerId") REFERENCES "AccountCustomer"("userId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountItem" ADD CONSTRAINT "AccountItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "AccountInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountSettings" ADD CONSTRAINT "AccountSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AccountCounter" ADD CONSTRAINT "AccountCounter_bounds" CHECK ("lastCode" BETWEEN 4100 AND 4199);
ALTER TABLE "AccountCustomer" ADD CONSTRAINT "AccountCustomer_code" CHECK ("code" ~ '^41(0[1-9]|[1-9][0-9])$');
ALTER TABLE "AccountSequence" ADD CONSTRAINT "AccountSequence_bounds" CHECK ("year" BETWEEN 2000 AND 2099 AND "lastNumber" BETWEEN 0 AND 99999);
ALTER TABLE "AccountInvoice" ADD CONSTRAINT "AccountInvoice_bounds" CHECK ("year" BETWEEN 2000 AND 2099 AND "sequence" BETWEEN 1 AND 99999 AND "total" >= 0);
ALTER TABLE "AccountInvoice" ADD CONSTRAINT "AccountInvoice_number" CHECK ("number" = 'INV' || right("year"::text, 2) || "customerCode" || lpad("sequence"::text, 5, '0'));
ALTER TABLE "AccountItem" ADD CONSTRAINT "AccountItem_values" CHECK ("position" >= 0 AND "quantity" BETWEEN 1 AND 100000 AND "unitPrice" BETWEEN 0 AND 100000000000 AND "lineTotal" = "quantity" * "unitPrice");
