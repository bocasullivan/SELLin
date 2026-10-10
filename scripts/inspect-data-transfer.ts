import { config, parse } from "dotenv";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

config({ quiet: true });

// Read-only preflight; never prints URLs, credentials, hashes or business content.
async function inspect() {
  const sourceUrl = process.env.DATABASE_URL;
  const targetEnv = parse(await readFile(".env.neon.local"));
  const targetUrl = targetEnv.DIRECT_URL;
  if (!sourceUrl || !targetUrl) throw new Error("Konfigurasi lokal/Neon belum tersedia.");
  const sourceHost = new URL(sourceUrl).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(sourceHost)) {
    throw new Error("Sumber harus PostgreSQL lokal.");
  }
  if (!new URL(targetUrl).hostname.endsWith(".neon.tech")) {
    throw new Error("Tujuan harus database Neon.");
  }
  const source = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 15000 });
  const target = new Client({ connectionString: targetUrl, connectionTimeoutMillis: 15000 });
  try {
    await source.connect();
    await target.connect();
    for (const [label, client] of [
      ["LOKAL", source],
      ["NEON", target],
    ] as const) {
      await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      console.log(label);
      const users = await client.query(`
        SELECT u."id", u."email",
          (SELECT count(*)::int FROM "AccountCustomer" c WHERE c."userId" = u."id") AS customers,
          (SELECT count(*)::int FROM "AccountInvoice" i WHERE i."userId" = u."id") AS invoices,
          (SELECT count(*)::int FROM "AccountItem" it JOIN "AccountInvoice" i ON i."id" = it."invoiceId" WHERE i."userId" = u."id") AS items,
          (SELECT count(*)::int FROM "AccountSettings" s WHERE s."userId" = u."id") AS settings
        FROM "User" u ORDER BY u."createdAt"
      `);
      console.log(JSON.stringify(users.rows, null, 2));
    }
    const conflicts = await source.query('SELECT "email" FROM "User"');
    const remote = await target.query('SELECT "email" FROM "User"');
    console.log(
      "Email terdapat di kedua database:",
      conflicts.rows
        .filter((row) =>
          remote.rows.some((other) => other.email.toLowerCase() === row.email.toLowerCase()),
        )
        .map((row) => row.email),
    );
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

inspect().catch(() => {
  console.error(
    "Pemeriksaan gagal. Periksa service lokal, konfigurasi Neon, koneksi TLS dan migrasi. Tidak ada data diubah.",
  );
  process.exitCode = 1;
});
