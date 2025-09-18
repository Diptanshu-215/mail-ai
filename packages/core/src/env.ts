import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development','test','production']).default('development'),
  APP_ORIGIN: z.string().url().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  JWT_SECRET: z.string().min(10),
  SESSION_SECRET: z.string().min(10),
  // Allow postgres style connection strings that are not valid http URLs
  DATABASE_URL: z.string().min(10),
  REDIS_URL: z.string().url(),
  API_ORIGIN: z.string().url().optional(),
  NEXT_PUBLIC_API_ORIGIN: z.string().url().optional(),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z.string().transform(v => v === 'true').optional(),
  COOKIE_SAME_SITE: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  VECTOR_PROVIDER: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  PINECONE_INDEX: z.string().optional(),
  ENABLE_RAG: z.string().transform(v => v === 'true').optional(),
  ENABLE_OPTIMIZER: z.string().transform(v => v === 'true').optional(),
  USE_LLM_STUB: z.string().transform(v => v === 'true').optional(),
  PROMPT_VERSION: z.string().default('1'),
  MAX_DRAFTS_PER_MONTH: z.string().transform(v => parseInt(v,10)).optional()
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;
export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  cached = parsed.data;
  return cached;
}
