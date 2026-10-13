// REVISI : Finalisasi hard delete setelah tenggat Undo dengan audit snapshot atomik.
import "server-only";
import { getDatabase } from "@/lib/db";
import { invoiceAuditSnapshot, jsonSafe } from "@/lib/audit";
import type { Prisma } from "@/generated/prisma/client";

export async function finalizeInvoiceDeletes(tx: Prisma.TransactionClient, userId: string) {
  const expired = await tx.accountInvoice.findMany({
    where: { userId, deleteAfter: { lte: new Date() } },
    include: { items: { orderBy: { position: "asc" } } },
  });
  for (const invoice of expired) {
    await tx.auditTrail.create({
      data: {
        userId,
        actorUserId: userId,
        entityType: "INVOICE",
        entityId: invoice.id,
        version: invoice.version + 1,
        action: "DELETE",
        changes: jsonSafe([
          {
            field: "record",
            label: "Invoice dihapus permanen",
            before: invoiceAuditSnapshot(invoice),
            after: null,
          },
        ]),
      },
    });
    await tx.accountInvoice.delete({ where: { id: invoice.id } });
  }
}

export async function cleanupInvoiceDeletes(userId: string) {
  await getDatabase().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    await finalizeInvoiceDeletes(tx, userId);
  });
}
// REVISI END
