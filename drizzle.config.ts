import { defineConfig } from "drizzle-kit";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://porn_ui_db_user:2tloHJqU6uFQCpf305TAbYK1Ck5uUBpE@dpg-d25ruoruibrs739arbn0-a.oregon-postgres.render.com/porn_ui_db?sslmode=require";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
    ssl: true,
  },
});
