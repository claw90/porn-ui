import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://porn_ui_db_user:2tloHJqU6uFQCpf305TAbYK1Ck5uUBpE@dpg-d25ruoruibrs739arbn0-a.oregon-postgres.render.com/porn_ui_db?sslmode=require";

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
export const db = drizzle({ client: pool, schema });
