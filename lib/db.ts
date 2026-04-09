import ws from 'ws';
import { drizzle } from 'drizzle-orm/neon-serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set');
}

export const db = drizzle({
  connection: process.env.DATABASE_URL,
  ws,
});
