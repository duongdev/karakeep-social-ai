/**
 * Base Adapter Tests
 *
 * Unit tests for the BaseAdapter class and common functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { BaseAdapter, type PlatformAdapter } from '../../../adapters/base'
import { AuthType, type Post } from '../../../adapters/types'
import {
  AdapterError,
  AuthenticationError,
  RateLimitError
} from '../../../adapters/errors'

// Mock adapter implementation for testing
class MockAdapter extends BaseAdapter {
  readonly platform = 'mock'

  async authenticate(_credentials: any): Promise<boolean> {
    return true
  }

  async fetchSavedPosts(_since?: Date): Promise<Post[]> {
    return [
      this.createPost({
        platformPostId: '123',
        url: 'https://example.com/post/123',
        title: 'Test Post',
        content: 'This is a test post',
        authorName: 'Test Author',
        authorUrl: 'https://example.com/author',
        mediaUrls: [],
        savedAt: new Date(),
        metadata: {}
      })
    ]
  }

  async validateCredentials(): Promise<boolean> {
    return this.authenticate(this.credentials)
  }

  getSupportedAuthTypes(): AuthType[] {
    return [AuthType.API_TOKEN]
  }
}

describe('BaseAdapter', () => {
  let adapter: MockAdapter

  beforeEach(() => {
    adapter = new MockAdapter({ apiToken: 'test-token' })
  })

  describe('constructor', () => {
    it('should initialize with credentials', () => {
      expect(adapter).toBeInstanceOf(BaseAdapter)
      expect(adapter.platform).toBe('mock')
    })

    it('should set default config values', () => {
      const adapterWithDefaults = new MockAdapter({ apiToken: 'test' })
      expect(adapterWithDefaults).toBeDefined()
    })

    it('should accept custom config', () => {
      const customAdapter = new MockAdapter(
        { apiToken: 'test' },
        {
          maxRetries: 5,
          timeout: 60000,
          debug: true
        }
      )
      expect(customAdapter).toBeDefined()
    })
  })

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const result = await adapter.authenticate({ apiToken: 'valid-token' })
      expect(result).toBe(true)
    })
  })

  describe('fetchSavedPosts', () => {
    it('should fetch posts', async () => {
      const posts = await adapter.fetchSavedPosts()
      expect(posts).toHaveLength(1)
      expect(posts[0]).toMatchObject({
        platformPostId: '123',
        url: expect.stringContaining('https://'),
        content: expect.any(String),
        authorName: expect.any(String),
        savedAt: expect.any(Date)
      })
    })

    it('should return standardized Post objects', async () => {
      const posts = await adapter.fetchSavedPosts()
      const post = posts[0]

      expect(post).toHaveProperty('platformPostId')
      expect(post).toHaveProperty('url')
      expect(post).toHaveProperty('content')
      expect(post).toHaveProperty('authorName')
      expect(post).toHaveProperty('authorUrl')
      expect(post).toHaveProperty('mediaUrls')
      expect(post).toHaveProperty('savedAt')
      expect(post).toHaveProperty('metadata')
    })
  })

  describe('validateCredentials', () => {
    it('should validate credentials', async () => {
      const result = await adapter.validateCredentials()
      expect(result).toBe(true)
    })
  })

  describe('getSupportedAuthTypes', () => {
    it('should return supported auth types', () => {
      const authTypes = adapter.getSupportedAuthTypes()
      expect(authTypes).toContain(AuthType.API_TOKEN)
    })
  })

  describe('createPost helper', () => {
    it('should create a standardized post', async () => {
      const posts = await adapter.fetchSavedPosts()
      const post = posts[0]

      expect(post.platformPostId).toBe('123')
      expect(post.url).toBe('https://example.com/post/123')
      expect(post.content).toBe('This is a test post')
      expect(post.mediaUrls).toEqual([])
      expect(post.metadata).toEqual({})
    })
  })

  describe('rateLimit', () => {
    it('should delay execution', async () => {
      const start = Date.now()
      await adapter['rateLimit'](100)
      const elapsed = Date.now() - start

      expect(elapsed).toBeGreaterThanOrEqual(90) // Allow some margin
    })
  })

  describe('retryWithBackoff', () => {
    it('should retry on failure', async () => {
      let attempts = 0

      const fn = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary error')
        }
        return 'success'
      }

      const result = await adapter['retryWithBackoff'](fn, 3)
      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should not retry on AuthenticationError', async () => {
      let attempts = 0

      const fn = async () => {
        attempts++
        throw new AuthenticationError('mock')
      }

      await expect(adapter['retryWithBackoff'](fn, 3)).rejects.toThrow(
        AuthenticationError
      )
      expect(attempts).toBe(1) // Should not retry
    })

    it('should throw after max retries', async () => {
      const fn = async () => {
        throw new Error('Persistent error')
      }

      await expect(adapter['retryWithBackoff'](fn, 2)).rejects.toThrow(
        'Persistent error'
      )
    })
  })

  describe('handleError', () => {
    it('should rethrow AdapterError as-is', () => {
      const error = new AdapterError('Test error', 'TEST', 'mock')

      expect(() => adapter['handleError'](error, 'test')).toThrow(AdapterError)
    })

    it('should convert HTTP 401 to AuthenticationError', () => {
      const httpError = {
        response: { status: 401 },
        config: { url: '/test' }
      }

      expect(() => adapter['handleError'](httpError, 'test')).toThrow(
        AuthenticationError
      )
    })

    it('should convert HTTP 429 to RateLimitError', () => {
      const httpError = {
        response: {
          status: 429,
          headers: { 'x-ratelimit-reset': '1234567890' }
        }
      }

      expect(() => adapter['handleError'](httpError, 'test')).toThrow(
        RateLimitError
      )
    })
  })

  describe('log', () => {
    it('should log when debug is enabled', () => {
      const debugAdapter = new MockAdapter(
        { apiToken: 'test' },
        { debug: true }
      )

      // Should not throw
      expect(() => debugAdapter['log']('test message')).not.toThrow()
    })

    it('should not log when debug is disabled', () => {
      const quietAdapter = new MockAdapter(
        { apiToken: 'test' },
        { debug: false }
      )

      // Should not throw
      expect(() => quietAdapter['log']('test message')).not.toThrow()
    })
  })

  describe('validateRequiredCredentials', () => {
    it('should pass when all required credentials present', () => {
      const adapterWithCreds = new MockAdapter({
        apiToken: 'test',
        apiSecret: 'secret'
      })

      expect(() =>
        adapterWithCreds['validateRequiredCredentials'](['apiToken', 'apiSecret'])
      ).not.toThrow()
    })

    it('should throw when credentials missing', () => {
      expect(() =>
        adapter['validateRequiredCredentials'](['apiToken', 'missingKey'])
      ).toThrow('Missing required credentials')
    })
  })
})
