/**
 * Health Check Routes
 *
 * Endpoints for monitoring service health and status
 */

import { Hono } from 'hono'
import { healthCheck } from '../lib/db'
import type { ApiResponse } from '../types'

const app = new Hono()

/**
 * GET /health
 * Basic health check endpoint
 */
app.get('/', async (c) => {
  const response: ApiResponse<{
    status: string
    timestamp: string
    uptime: number
    database: boolean
  }> = {
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: await healthCheck(),
    },
  }

  return c.json(response)
})

/**
 * GET /health/db
 * Database-specific health check
 */
app.get('/db', async (c) => {
  const isHealthy = await healthCheck()

  if (!isHealthy) {
    return c.json(
      {
        success: false,
        error: 'Database connection failed',
      },
      503
    )
  }

  return c.json({
    success: true,
    data: {
      database: 'connected',
      timestamp: new Date().toISOString(),
    },
  })
})

export default app
