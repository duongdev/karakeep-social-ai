/**
 * Adapter Registry Tests
 *
 * Unit tests for the AdapterRegistry class
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { AdapterRegistry } from '../../../adapters/registry'
import { BaseAdapter } from '../../../adapters/base'
import { AuthType, type Post } from '../../../adapters/types'
import { AdapterError } from '../../../adapters/errors'

// Mock adapter for testing
class TestAdapter extends BaseAdapter {
  readonly platform = 'test'

  async authenticate(_credentials: any): Promise<boolean> {
    return true
  }

  async fetchSavedPosts(_since?: Date): Promise<Post[]> {
    return []
  }

  async validateCredentials(): Promise<boolean> {
    return true
  }

  getSupportedAuthTypes(): AuthType[] {
    return [AuthType.API_TOKEN]
  }
}

// Another mock adapter
class AnotherAdapter extends BaseAdapter {
  readonly platform = 'another'

  async authenticate(_credentials: any): Promise<boolean> {
    return true
  }

  async fetchSavedPosts(_since?: Date): Promise<Post[]> {
    return []
  }

  async validateCredentials(): Promise<boolean> {
    return true
  }

  getSupportedAuthTypes(): AuthType[] {
    return [AuthType.OAUTH2]
  }
}

describe('AdapterRegistry', () => {
  let registry: AdapterRegistry

  beforeEach(() => {
    registry = new AdapterRegistry()
  })

  afterEach(() => {
    registry.clear()
  })

  describe('register', () => {
    it('should register an adapter', () => {
      registry.register('test', {
        displayName: 'Test Platform',
        description: 'Test adapter',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      expect(registry.hasAdapter('test')).toBe(true)
    })

    it('should throw when registering duplicate', () => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      expect(() =>
        registry.register('test', {
          displayName: 'Test',
          description: 'Test',
          supportedAuthTypes: [AuthType.API_TOKEN],
          requiresWebhookSupport: false,
          adapterClass: TestAdapter
        })
      ).toThrow('already registered')
    })
  })

  describe('unregister', () => {
    it('should unregister an adapter', () => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      expect(registry.hasAdapter('test')).toBe(true)

      registry.unregister('test')
      expect(registry.hasAdapter('test')).toBe(false)
    })
  })

  describe('create', () => {
    beforeEach(() => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })
    })

    it('should create adapter instance', () => {
      const adapter = registry.create('test', { apiToken: 'test' })

      expect(adapter).toBeInstanceOf(TestAdapter)
      expect(adapter.platform).toBe('test')
    })

    it('should throw for unknown platform', () => {
      expect(() => registry.create('unknown', {})).toThrow(AdapterError)
      expect(() => registry.create('unknown', {})).toThrow(
        'No adapter registered'
      )
    })
  })

  describe('hasAdapter', () => {
    it('should return true for registered adapter', () => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      expect(registry.hasAdapter('test')).toBe(true)
    })

    it('should return false for unregistered adapter', () => {
      expect(registry.hasAdapter('nonexistent')).toBe(false)
    })
  })

  describe('getSupportedPlatforms', () => {
    it('should return empty array when no adapters', () => {
      expect(registry.getSupportedPlatforms()).toEqual([])
    })

    it('should return registered platforms', () => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      registry.register('another', {
        displayName: 'Another',
        description: 'Another',
        supportedAuthTypes: [AuthType.OAUTH2],
        requiresWebhookSupport: false,
        adapterClass: AnotherAdapter
      })

      const platforms = registry.getSupportedPlatforms()
      expect(platforms).toContain('test')
      expect(platforms).toContain('another')
      expect(platforms).toHaveLength(2)
    })
  })

  describe('getAdapterMetadata', () => {
    it('should return metadata for registered adapter', () => {
      registry.register('test', {
        displayName: 'Test Platform',
        description: 'A test adapter',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      const metadata = registry.getAdapterMetadata('test')

      expect(metadata).toBeDefined()
      expect(metadata?.displayName).toBe('Test Platform')
      expect(metadata?.description).toBe('A test adapter')
    })

    it('should return undefined for unknown adapter', () => {
      const metadata = registry.getAdapterMetadata('unknown')
      expect(metadata).toBeUndefined()
    })
  })

  describe('getAllAdapterMetadata', () => {
    it('should return all metadata', () => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      registry.register('another', {
        displayName: 'Another',
        description: 'Another',
        supportedAuthTypes: [AuthType.OAUTH2],
        requiresWebhookSupport: false,
        adapterClass: AnotherAdapter
      })

      const allMetadata = registry.getAllAdapterMetadata()
      expect(allMetadata).toHaveLength(2)
    })
  })

  describe('getPlatformsByAuthType', () => {
    beforeEach(() => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      registry.register('another', {
        displayName: 'Another',
        description: 'Another',
        supportedAuthTypes: [AuthType.OAUTH2],
        requiresWebhookSupport: false,
        adapterClass: AnotherAdapter
      })
    })

    it('should return platforms by auth type', () => {
      const tokenPlatforms = registry.getPlatformsByAuthType(AuthType.API_TOKEN)
      expect(tokenPlatforms).toContain('test')
      expect(tokenPlatforms).not.toContain('another')

      const oauth2Platforms = registry.getPlatformsByAuthType(AuthType.OAUTH2)
      expect(oauth2Platforms).toContain('another')
      expect(oauth2Platforms).not.toContain('test')
    })

    it('should return empty array for unused auth type', () => {
      const platforms = registry.getPlatformsByAuthType(AuthType.COOKIE)
      expect(platforms).toEqual([])
    })
  })

  describe('getPlatformsWithWebhookSupport', () => {
    it('should return platforms with webhook support', () => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      registry.register('another', {
        displayName: 'Another',
        description: 'Another',
        supportedAuthTypes: [AuthType.OAUTH2],
        requiresWebhookSupport: true,
        adapterClass: AnotherAdapter
      })

      const webhookPlatforms = registry.getPlatformsWithWebhookSupport()
      expect(webhookPlatforms).toContain('another')
      expect(webhookPlatforms).not.toContain('test')
    })
  })

  describe('clear', () => {
    it('should remove all registered adapters', () => {
      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      expect(registry.count).toBe(1)

      registry.clear()
      expect(registry.count).toBe(0)
      expect(registry.getSupportedPlatforms()).toEqual([])
    })
  })

  describe('count', () => {
    it('should return correct count', () => {
      expect(registry.count).toBe(0)

      registry.register('test', {
        displayName: 'Test',
        description: 'Test',
        supportedAuthTypes: [AuthType.API_TOKEN],
        requiresWebhookSupport: false,
        adapterClass: TestAdapter
      })

      expect(registry.count).toBe(1)

      registry.register('another', {
        displayName: 'Another',
        description: 'Another',
        supportedAuthTypes: [AuthType.OAUTH2],
        requiresWebhookSupport: false,
        adapterClass: AnotherAdapter
      })

      expect(registry.count).toBe(2)
    })
  })
})
