import { config, parse } from "dotenv";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Client } from "pg";

config({ quiet: true });

const tables = [
  "User",
  "AccountCounter",
  "AccountCustomer",
  "AccountSequence",
  "AccountInvoice",
  "AccountItem",
  "AccountSettings",
] as const;

async function transfer() {
  if (!process.argv.includes("--apply")) {
    throw new Error("Jalankan dengan --apply hanya setelah pemeriksaan read-only.");
  }
  const sourceUrl = process.env.DATABASE_URL;
  const targetUrl = parse(await readFile(".env.neon.local")).DIRECT_URL;
  if (!sourceUrl || !targetUrl) throw new Error("Konfigurasi belum tersedia.");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(sourceUrl).hostname)) {
    throw new Error("Sumber harus database lokal.");
  }
  if (!new URL(targetUrl).hostname.endsWith(".neon.tech")) {
    throw new Error("Tujuan harus Neon.");
  }
  const source = new Client({ connectionString: sourceUrl, connectionTimeoutMillis: 15000 });
  const target = new Client({ connectionString: targetUrl, connectionTimeoutMillis: 15000 });
  let committed = false;
  try {
    await source.connect();
    await target.connect();
    await source.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await target.query("BEGIN");
    await target.query("SET LOCAL lock_timeout = '15s'");
    await target.query("SET LOCAL statement_timeout = '60s'");
    // Prevent registration/business writes between the empty check and commit.
    await target.query(
      `LOCK TABLE ${tables.map((table) => `"${table}"`).join(", ")} IN SHARE ROW EXCLUSIVE MODE`,
    );
    const sourceRows: Record<string, Record<string, unknown>[]> = {};
    const targetRows: Record<string, Record<string, unknown>[]> = {};
    for (const table of tables) {
      sourceRows[table] = (await source.query(`SELECT * FROM "${table}"`)).rows;
      targetRows[table] = (await target.query(`SELECT * FROM "${table}"`)).rows;
      if (targetRows[table].length) {
        throw new Error(
          "Tujuan sudah memiliki data. Penyalinan dibatalkan; tidak boleh overwrite.",
        );
      }
    }
    if (!sourceRows.User.length) throw new Error("Tidak ada akun lokal untuk disalin.");
    const folder = `backups/transfer-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    await mkdir(folder, { recursive: true });
    // Includes password hashes and financial data: private, ignored by Git.
    await writeFile(
      `${folder}/local.json`,
      JSON.stringify({ version: 1, tables: sourceRows }, null, 2),
      { flag: "wx" },
    );
    await writeFile(
      `${folder}/neon-before.json`,
      JSON.stringify({ version: 1, tables: targetRows }, null, 2),
      { flag: "wx" },
    );
    console.log(`Backup privat dibuat: ${folder}`);
    for (const table of tables) {
      for (const row of sourceRows[table]) {
        const columns = Object.keys(row);
        if (columns.some((column) => !/^[A-Za-z][A-Za-z0-9]*$/.test(column))) {
          throw new Error("Kolom tidak valid.");
        }
        await target.query(
          `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")}) VALUES (${columns.map((_, index) => `$${index + 1}`).join(", ")})`,
          columns.map((column) => row[column]),
        );
      }
      const actual = (await target.query(`SELECT * FROM "${table}"`)).rows;
      const canonical = (rows: Record<string, unknown>[]) =>
        rows
          .map((row) =>
            JSON.stringify(
              Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b))),
            ),
          )
          .sort();
      if (JSON.stringify(canonical(actual)) !== JSON.stringify(canonical(sourceRows[table]))) {
        throw new Error("Verifikasi isi gagal. Transaksi dibatalkan.");
      }
      console.log(`${table}: ${actual.length} baris, isi terverifikasi.`);
    }
    await target.query("COMMIT");
    committed = true;
    await source.query("ROLLBACK");
    await writeFile(
      `${folder}/result.json`,
      JSON.stringify(
        {
          committed: true,
          completedAt: new Date().toISOString(),
          counts: Object.fromEntries(tables.map((table) => [table, sourceRows[table].length])),
        },
        null,
        2,
      ),
    );
    console.log(
      "Selesai. Data lokal tidak diubah. Session dan counter percobaan login tidak disalin.",
    );
  } catch (error) {
    if (!committed) await target.query("ROLLBACK").catch(() => undefined);
    // Do not print raw PostgreSQL exceptions: they may contain private row values.
    console.error(
      committed
        ? "Penyalinan sudah commit; pencatatan hasil gagal. Periksa read-only sebelum mencoba lagi."
        : "Penyalinan gagal/dibatalkan. Tidak ada perubahan yang di-commit ke Neon.",
    );
    if (error instanceof Error && !Reflect.has(error, "severity")) console.error(error.message);
    process.exitCode = 1;
  } finally {
    await Promise.allSettled([source.end(), target.end()]);
  }
}

transfer().catch(() => {
  console.error(
    "Tidak dapat memulai transfer. Periksa konfigurasi lokal/Neon. Jangan kirim secret.",
  );
  process.exitCode = 1;
});
