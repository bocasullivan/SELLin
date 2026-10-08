import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL belum tersedia. Ikuti docs/database-setup.md.");
  process.exit(1);
}

const database = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  await database.$queryRaw`SELECT 1`;
  const customers = await database.customer.count();
  const invoices = await database.invoice.count();
  console.log(`Koneksi dan tabel siap. Customer: ${customers}; invoice: ${invoices}.`);
} catch {
  console.error(
    "Koneksi atau tabel belum siap. Periksa service PostgreSQL, .env, lalu jalankan npm.cmd run db:migrate.",
  );
  process.exitCode = 1;
} finally {
  await database.$disconnect();
}
