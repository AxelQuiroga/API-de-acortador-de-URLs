import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().url("MONGODB_URI debe ser una URL válida"),
  BASE_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("*"),
  FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Error grave en las variables de entorno:");
  console.error(_env.error.format());
  process.exit(1); 
}

export const env = _env.data;