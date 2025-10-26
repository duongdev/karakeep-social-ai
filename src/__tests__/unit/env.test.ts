/**
 * Environment Configuration Tests
 */

import { describe, it, expect } from '@jest/globals'

describe('Environment Configuration', () => {

  it('should load environment variables', () => {
    expect(process.env.NODE_ENV).toBeDefined()
    expect(process.env.DATABASE_URL).toBeDefined()
  })

  it('should have test environment', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  it('should have database URL configured', () => {
    const dbUrl = process.env.DATABASE_URL
    expect(dbUrl).toContain('postgresql://')
    expect(dbUrl).toContain('karakeep')
  })

  it('should have Redis URL configured', () => {
    const redisUrl = process.env.REDIS_URL
    expect(redisUrl).toContain('redis://')
  })

  it('should have test port configured', () => {
    expect(process.env.PORT).toBe('3001')
  })

  it('should validate required environment variables', () => {
    const requiredVars = ['NODE_ENV', 'DATABASE_URL', 'PORT']

    requiredVars.forEach((varName) => {
      expect(process.env[varName]).toBeDefined()
      expect(process.env[varName]).not.toBe('')
    })
  })
})
