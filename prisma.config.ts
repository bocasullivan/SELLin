import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Placeholder allows generation/validation without a configured database.
    // Connection commands still require a real DATABASE_URL.
    url:
      process.env.DATABASE_URL ??
      "postgresql://unconfigured:unconfigured@127.0.0.1:5432/sellin_dev",
  },
});
