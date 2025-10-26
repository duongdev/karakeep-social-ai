/**
 * Jest Test Setup
 *
 * Global configuration and setup for all tests
 */

import { jest } from '@jest/globals'

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://karakeep:karakeep_dev_password@localhost:5432/karakeep_test?schema=public'
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://:karakeep_redis_password@localhost:6379/1'
process.env.PORT = '3001'

// Increase timeout for integration tests
jest.setTimeout(10000)

// Global test lifecycle hooks
beforeAll(() => {
  // Setup before all tests
})

afterAll(() => {
  // Cleanup after all tests
})

beforeEach(() => {
  // Setup before each test
})

afterEach(() => {
  // Cleanup after each test
})
