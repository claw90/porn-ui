import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

// Use SQLite for development
const sqlite = new Database('./dev.db'); // File-based database for development
export const db = drizzle(sqlite, { schema });
