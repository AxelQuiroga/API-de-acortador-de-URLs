import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string().url("MONGODB_URI debe ser una URL válida"),
  BASE_URL: z.string().url().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("*").transform(s => s.split(',').map(v => v.trim())),
  FRONTEND_URL: z.string().url().default("http://localhost:3001"),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (data.CORS_ORIGIN === '*') {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGIN'], message: 'CORS_ORIGIN debe ser explícito en producción (no usar *)' });
    }
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(data.BASE_URL)) {
      ctx.addIssue({ code: 'custom', path: ['BASE_URL'], message: 'BASE_URL debe ser explícito en producción' });
    }
    if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(data.FRONTEND_URL)) {
      ctx.addIssue({ code: 'custom', path: ['FRONTEND_URL'], message: 'FRONTEND_URL debe ser explícito en producción' });
    }
  }
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Error grave en las variables de entorno:");
  console.error(_env.error.format());
  process.exit(1);
}

export const env = _env.data;