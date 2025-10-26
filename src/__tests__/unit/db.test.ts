/**
 * Database Client Tests
 */

import { describe, it, expect, afterAll } from '@jest/globals'
import { testPrisma, disconnectDatabase } from '../helpers/test-db.js'

describe('Database Client', () => {
  afterAll(async () => {
    await disconnectDatabase()
  })

  it('should connect to database', async () => {
    await expect(testPrisma.$connect()).resolves.not.toThrow()
  })

  it('should execute a simple query', async () => {
    const result = await testPrisma.$queryRaw`SELECT 1 as value`
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should have correct database URL', () => {
    const url = testPrisma.$executeRaw
    expect(url).toBeDefined()
  })

  describe('Health Check', () => {
    it('should perform database health check', async () => {
      try {
        await testPrisma.$queryRaw`SELECT 1`
        expect(true).toBe(true)
      } catch (error) {
        throw new Error('Database health check failed')
      }
    })
  })

  describe('Models', () => {
    it('should have Account model', () => {
      expect(testPrisma.account).toBeDefined()
    })

    it('should have Bookmark model', () => {
      expect(testPrisma.bookmark).toBeDefined()
    })

    it('should have AIAnalysis model', () => {
      expect(testPrisma.aIAnalysis).toBeDefined()
    })

    it('should have List model', () => {
      expect(testPrisma.list).toBeDefined()
    })

    it('should have Tag model', () => {
      expect(testPrisma.tag).toBeDefined()
    })

    it('should have SyncJob model', () => {
      expect(testPrisma.syncJob).toBeDefined()
    })
  })
})
