/**
 * Health Check Endpoints Tests
 */

import { describe, it, expect } from '@jest/globals'
import { Hono } from 'hono'
import healthRoutes from '../../routes/health.js'
import { testEndpoint, expectSuccess } from '../helpers/test-server.js'

describe('Health Check Endpoints', () => {
  const app = new Hono()
  app.route('/health', healthRoutes)

  describe('GET /health', () => {
    it('should return 200 status', async () => {
      const res = await testEndpoint(app, 'GET', '/health')
      expect(res.status).toBe(200)
    })

    it('should return success response', async () => {
      const res = await testEndpoint(app, 'GET', '/health')
      const data = expectSuccess(res)

      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('uptime')
      expect(data).toHaveProperty('database')
    })

    it('should have valid timestamp', async () => {
      const res = await testEndpoint(app, 'GET', '/health')
      const data = expectSuccess(res)

      const timestamp = new Date(data.timestamp)
      expect(timestamp.getTime()).not.toBeNaN()
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should have positive uptime', async () => {
      const res = await testEndpoint(app, 'GET', '/health')
      const data = expectSuccess(res)

      expect(typeof data.uptime).toBe('number')
      expect(data.uptime).toBeGreaterThan(0)
    })

    it('should check database connectivity', async () => {
      const res = await testEndpoint(app, 'GET', '/health')
      const data = expectSuccess(res)

      expect(typeof data.database).toBe('boolean')
    })
  })

  describe('GET /health/db', () => {
    it('should return 200 status when database is connected', async () => {
      const res = await testEndpoint(app, 'GET', '/health/db')
      expect(res.status).toBe(200)
    })

    it('should return database connection status', async () => {
      const res = await testEndpoint(app, 'GET', '/health/db')
      const data = expectSuccess(res)

      expect(data).toHaveProperty('database', 'connected')
      expect(data).toHaveProperty('timestamp')
    })

    it('should have valid timestamp', async () => {
      const res = await testEndpoint(app, 'GET', '/health/db')
      const data = expectSuccess(res)

      const timestamp = new Date(data.timestamp)
      expect(timestamp.getTime()).not.toBeNaN()
    })
  })
})
