/**
 * Environment Variable Configuration
 *
 * Centralized environment variable access with validation
 */

import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // AI Services
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-3-5-sonnet-20241022'),
  CLAUDE_MAX_TOKENS: z.string().default('4096'),

  OPENAI_API_KEY: z.string().optional(),

  // External Services
  COBALT_API_URL: z.string().default('https://api.cobalt.tools'),
  REDIS_URL: z.string().optional(),

  // Platform API Keys (all optional, can be added per platform)
  TWITTER_BEARER_TOKEN: z.string().optional(),
  REDDIT_CLIENT_ID: z.string().optional(),
  REDDIT_CLIENT_SECRET: z.string().optional(),
  REDDIT_USERNAME: z.string().optional(),
  REDDIT_PASSWORD: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),

  // Security
  ENCRYPTION_KEY: z.string().optional(),
  API_SECRET_KEY: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

/**
 * Parse and validate environment variables
 */
function parseEnv(): Env {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:')
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      process.exit(1)
    }
    throw error
  }
}

export const env = parseEnv()
