/**
 * Platform Adapter Registry
 *
 * Central registry for managing and instantiating platform adapters
 * Implements the Factory pattern for adapter creation
 */

import { type PlatformAdapter, BaseAdapter } from './base'
import { AdapterError } from './errors'
import { type AuthType } from './types'

/**
 * Adapter class constructor type
 */
type AdapterConstructor = new (credentials: any, config?: any) => PlatformAdapter

/**
 * Adapter metadata for registry
 */
interface AdapterMetadata {
  name: string
  displayName: string
  description: string
  supportedAuthTypes: AuthType[]
  requiresWebhookSupport: boolean
  adapterClass: AdapterConstructor
}

/**
 * Adapter Registry
 *
 * Manages registration and instantiation of platform adapters
 */
export class AdapterRegistry {
  private adapters = new Map<string, AdapterMetadata>()

  /**
   * Register a new platform adapter
   * @param platform Platform identifier (lowercase)
   * @param metadata Adapter metadata and class
   */
  register(platform: string, metadata: Omit<AdapterMetadata, 'name'>): void {
    if (this.adapters.has(platform)) {
      throw new Error(
        `Adapter for platform '${platform}' is already registered`
      )
    }

    this.adapters.set(platform, {
      name: platform,
      ...metadata
    })
  }

  /**
   * Unregister an adapter (useful for testing)
   * @param platform Platform identifier
   */
  unregister(platform: string): void {
    this.adapters.delete(platform)
  }

  /**
   * Create an adapter instance for a platform
   * @param platform Platform identifier
   * @param credentials Platform-specific credentials
   * @param config Optional adapter configuration
   * @returns PlatformAdapter instance
   */
  create(platform: string, credentials: any, config?: any): PlatformAdapter {
    const metadata = this.adapters.get(platform)

    if (!metadata) {
      throw new AdapterError(
        `No adapter registered for platform: ${platform}`,
        'ADAPTER_NOT_FOUND',
        platform
      )
    }

    try {
      return new metadata.adapterClass(credentials, config)
    } catch (error) {
      throw new AdapterError(
        `Failed to create adapter for ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ADAPTER_CREATION_FAILED',
        platform,
        error
      )
    }
  }

  /**
   * Check if an adapter is registered for a platform
   * @param platform Platform identifier
   */
  hasAdapter(platform: string): boolean {
    return this.adapters.has(platform)
  }

  /**
   * Get list of all registered platforms
   */
  getSupportedPlatforms(): string[] {
    return Array.from(this.adapters.keys())
  }

  /**
   * Get metadata for a specific adapter
   * @param platform Platform identifier
   */
  getAdapterMetadata(platform: string): AdapterMetadata | undefined {
    return this.adapters.get(platform)
  }

  /**
   * Get all adapter metadata
   */
  getAllAdapterMetadata(): AdapterMetadata[] {
    return Array.from(this.adapters.values())
  }

  /**
   * Get platforms that support a specific auth type
   * @param authType Authentication type
   */
  getPlatformsByAuthType(authType: AuthType): string[] {
    return Array.from(this.adapters.entries())
      .filter(([_, metadata]) => metadata.supportedAuthTypes.includes(authType))
      .map(([platform]) => platform)
  }

  /**
   * Get platforms that support webhooks
   */
  getPlatformsWithWebhookSupport(): string[] {
    return Array.from(this.adapters.entries())
      .filter(([_, metadata]) => metadata.requiresWebhookSupport)
      .map(([platform]) => platform)
  }

  /**
   * Clear all registered adapters (useful for testing)
   */
  clear(): void {
    this.adapters.clear()
  }

  /**
   * Get count of registered adapters
   */
  get count(): number {
    return this.adapters.size
  }
}

/**
 * Singleton instance of the adapter registry
 * Use this throughout the application
 */
export const adapterRegistry = new AdapterRegistry()

/**
 * Helper function to create an adapter
 * Shorthand for adapterRegistry.create()
 */
export function createAdapter(
  platform: string,
  credentials: any,
  config?: any
): PlatformAdapter {
  return adapterRegistry.create(platform, credentials, config)
}

/**
 * Helper function to check if platform is supported
 */
export function isPlatformSupported(platform: string): boolean {
  return adapterRegistry.hasAdapter(platform)
}

/**
 * Helper function to get all supported platforms
 */
export function getSupportedPlatforms(): string[] {
  return adapterRegistry.getSupportedPlatforms()
}
