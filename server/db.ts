import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Use PostgreSQL if available, otherwise fallback to in-memory storage
if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL not found, using in-memory storage as fallback");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });