-- REVISI : Konversi nomor lama per akun/tahun, kode manual, dan Undo server; jalankan setelah backup.
BEGIN;
ALTER TABLE "AccountCustomer" DROP CONSTRAINT "AccountCustomer_code";
ALTER TABLE "AccountInvoice" DROP CONSTRAINT "AccountInvoice_number";
ALTER TABLE "AccountInvoice" DROP CONSTRAINT "AccountInvoice_bounds";
ALTER TABLE "AccountCustomer" ALTER COLUMN "code" TYPE VARCHAR(10);
ALTER TABLE "AccountInvoice" ALTER COLUMN "customerCode" TYPE VARCHAR(10);
ALTER TABLE "AccountInvoice" ADD COLUMN "deleteAfter" TIMESTAMP(3);
DROP INDEX "AccountInvoice_userId_customerId_year_sequence_key";
CREATE TEMP TABLE invoice_renumber AS
SELECT "id", "userId", "number" AS old_number, "version", 
EXTRACT(YEAR FROM "issuedAt")::integer AS new_year,
ROW_NUMBER() OVER (PARTITION BY "userId", EXTRACT(YEAR FROM "issuedAt") ORDER BY "issuedAt", "createdAt", "id")::integer AS new_sequence
FROM "AccountInvoice";
-- Avoid transient unique collisions during the conversion.
DROP INDEX "AccountInvoice_userId_number_key";
UPDATE "AccountInvoice" i SET
"number" = 'INV' || RIGHT(r.new_year::text, 2) || LPAD(r.new_sequence::text, 6, '0'),
"year" = r.new_year, "sequence" = r.new_sequence,
"version" = i."version" + 1, "updatedAt" = CURRENT_TIMESTAMP,
"updatedByUserId" = i."userId"
FROM invoice_renumber r WHERE i."id" = r."id";
INSERT INTO "AuditTrail" ("userId", "actorUserId", "entityType", "entityId", "version", "action", "changes", "reason")
SELECT i."userId", i."userId", 'INVOICE', i."id", i."version", 'UPDATE',
jsonb_build_array(jsonb_build_object('field','number','label','Nomor invoice','before',r.old_number,'after',i."number")),
'Migrasi format INVYYNNNNNN (sistem)'
FROM "AccountInvoice" i JOIN invoice_renumber r ON i."id" = r."id";
CREATE UNIQUE INDEX "AccountInvoice_userId_number_key" ON "AccountInvoice"("userId", "number");
CREATE UNIQUE INDEX "AccountInvoice_userId_year_sequence_key" ON "AccountInvoice"("userId", "year", "sequence");
ALTER TABLE "AccountCustomer" ADD CONSTRAINT "AccountCustomer_code" CHECK ("code" ~ '^[A-Za-z0-9_-]{1,10}$');
ALTER TABLE "AccountInvoice" ADD CONSTRAINT "AccountInvoice_bounds" CHECK ("year" BETWEEN 2000 AND 2099 AND "sequence" BETWEEN 1 AND 999999 AND "total" >= 0);
ALTER TABLE "AccountInvoice" ADD CONSTRAINT "AccountInvoice_number" CHECK ("number" = 'INV' || right("year"::text, 2) || lpad("sequence"::text, 6, '0'));
-- Legacy soft-deleted records remain reserved until explicitly reviewed; do not silently destroy them.
COMMIT;
-- REVISI END
