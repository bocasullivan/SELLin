import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalDatabase = globalThis as unknown as { prisma?: PrismaClient };

export function getDatabase() {
  const cached = globalDatabase.prisma;
  // Fast Refresh preserves globalThis even after Prisma adds new models.
  // Reuse only a client that exposes the current application's delegates.
  if (
    cached?.accountCustomer &&
    cached.accountInvoice &&
    cached.accountSettings &&
    cached.accountCounter &&
    cached.accountSequence &&
    cached.accountItem &&
    cached.user &&
    cached.session &&
    cached.authAttempt
  ) {
    return cached;
  }

  if (cached) {
    globalDatabase.prisma = undefined;
    void cached.$disconnect().catch(() => undefined);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL belum dikonfigurasi. Ikuti docs/database-setup.md.");
  }

  const adapter = new PrismaPg({ connectionString });
  const database = new PrismaClient({ adapter });
  if (!database.accountCustomer) {
    void database.$disconnect().catch(() => undefined);
    throw new Error(
      "Prisma Client belum diperbarui. Hentikan server, jalankan npm.cmd run db:generate, lalu npm.cmd run dev.",
    );
  }
  globalDatabase.prisma = database;
  return database;
}
