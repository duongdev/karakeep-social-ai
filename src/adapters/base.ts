/**
 * Base Platform Adapter
 *
 * Abstract base class providing common functionality for all platform adapters
 */

import {
  type Post,
  type AuthType,
  type PaginatedResponse,
  type RateLimitInfo,
  type AdapterConfig,
  type WebhookConfig
} from './types'
import {
  AdapterError,
  AuthenticationError,
  RateLimitError,
  ResourceNotFoundError,
  NetworkError,
  ServiceUnavailableError
} from './errors'

/**
 * Platform Adapter Interface
 *
 * All platform adapters must implement this interface
 */
export interface PlatformAdapter {
  /**
   * Platform identifier (lowercase)
   * Examples: 'twitter', 'reddit', 'github', 'youtube'
   */
  readonly platform: string

  /**
   * Authenticate with the platform using provided credentials
   * @param credentials Platform-specific credentials
   * @returns Promise<boolean> indicating success
   */
  authenticate(credentials: any): Promise<boolean>

  /**
   * Fetch saved/bookmarked posts from the platform
   * @param since Optional date to fetch posts since (for incremental sync)
   * @returns Promise<Post[]> array of standardized posts
   */
  fetchSavedPosts(since?: Date): Promise<Post[]>

  /**
   * Validate that current credentials are still valid
   * @returns Promise<boolean> indicating if credentials are valid
   */
  validateCredentials(): Promise<boolean>

  /**
   * Get supported authentication types for this platform
   * @returns AuthType[] array of supported auth types
   */
  getSupportedAuthTypes(): AuthType[]

  /**
   * Optional: Get current rate limit information
   */
  getRateLimitInfo?(): Promise<RateLimitInfo>

  /**
   * Optional: Setup webhook for real-time updates
   * Only available for platforms that support webhooks (e.g., GitHub)
   */
  setupWebhook?(config: WebhookConfig): Promise<void>

  /**
   * Optional: Remove webhook
   */
  removeWebhook?(webhookId: string): Promise<void>
}

/**
 * Abstract base adapter class with common functionality
 */
export abstract class BaseAdapter implements PlatformAdapter {
  protected credentials: any
  protected config: Required<AdapterConfig>

  abstract readonly platform: string

  constructor(credentials: any, config?: AdapterConfig) {
    this.credentials = credentials
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      timeout: config?.timeout ?? 30000,
      rateLimit: config?.rateLimit ?? {
        maxRequests: 50,
        windowMs: 60000 // 1 minute
      },
      debug: config?.debug ?? false
    }
  }

  // Abstract methods that must be implemented by subclasses
  abstract authenticate(credentials: any): Promise<boolean>
  abstract fetchSavedPosts(since?: Date): Promise<Post[]>
  abstract validateCredentials(): Promise<boolean>
  abstract getSupportedAuthTypes(): AuthType[]

  /**
   * Common rate limiting logic
   * @param waitMs Milliseconds to wait
   */
  protected async rateLimit(waitMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, waitMs))
  }

  /**
   * Retry logic with exponential backoff
   * @param fn Function to retry
   * @param maxRetries Maximum number of retries (default: from config)
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.config.maxRetries

    for (let i = 0; i < retries; i++) {
      try {
        return await fn()
      } catch (error) {
        // Don't retry on auth errors or client errors
        if (
          error instanceof AuthenticationError ||
          error instanceof ResourceNotFoundError
        ) {
          throw error
        }

        // Last retry - throw the error
        if (i === retries - 1) {
          throw error
        }

        // Calculate exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.min(Math.pow(2, i) * 1000, 30000)

        if (this.config.debug) {
          console.log(
            `[${this.platform}] Retry ${i + 1}/${retries} after ${delay}ms`
          )
        }

        await this.rateLimit(delay)
      }
    }

    throw new Error('Max retries exceeded')
  }

  /**
   * Common error handling and transformation
   * @param error Original error
   * @param context Context where error occurred
   */
  protected handleError(error: any, context: string): never {
    if (this.config.debug) {
      console.error(`[${this.platform}] ${context}:`, error)
    }

    // Already an AdapterError - just rethrow
    if (error instanceof AdapterError) {
      throw error
    }

    // Handle HTTP errors from axios or fetch
    if (error.response) {
      const status = error.response.status

      switch (status) {
        case 401:
        case 403:
          throw new AuthenticationError(this.platform, error)

        case 404:
          throw new ResourceNotFoundError(
            this.platform,
            error.config?.url || 'unknown',
            error
          )

        case 429:
          const resetTime = this.extractRateLimitReset(error.response.headers)
          throw new RateLimitError(this.platform, resetTime, error)

        case 500:
        case 502:
        case 503:
        case 504:
          throw new ServiceUnavailableError(this.platform, error)

        default:
          throw new AdapterError(
            `HTTP ${status} error: ${error.message}`,
            'HTTP_ERROR',
            this.platform,
            error
          )
      }
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new NetworkError(this.platform, error)
    }

    // Generic error
    throw new AdapterError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      this.platform,
      error
    )
  }

  /**
   * Extract rate limit reset time from response headers
   * @param headers Response headers
   */
  private extractRateLimitReset(headers: any): Date | undefined {
    // Try common header names
    const resetHeader =
      headers['x-ratelimit-reset'] ||
      headers['x-rate-limit-reset'] ||
      headers['ratelimit-reset']

    if (!resetHeader) return undefined

    // Unix timestamp (seconds)
    if (/^\d+$/.test(resetHeader)) {
      return new Date(parseInt(resetHeader) * 1000)
    }

    // ISO date string
    try {
      return new Date(resetHeader)
    } catch {
      return undefined
    }
  }

  /**
   * Log debug messages
   * @param message Message to log
   * @param data Optional data to include
   */
  protected log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[${this.platform}] ${message}`, data || '')
    }
  }

  /**
   * Validate that required credentials are present
   * @param required Array of required credential keys
   */
  protected validateRequiredCredentials(required: string[]): void {
    const missing = required.filter(key => !this.credentials[key])

    if (missing.length > 0) {
      throw new AdapterError(
        `Missing required credentials: ${missing.join(', ')}`,
        'MISSING_CREDENTIALS',
        this.platform
      )
    }
  }

  /**
   * Create a standardized Post object
   * Helper method for adapters to map platform data to standard format
   */
  protected createPost(data: {
    platformPostId: string
    url: string
    title?: string
    content: string
    authorName: string
    authorUrl: string
    mediaUrls?: string[]
    savedAt: Date
    metadata?: Record<string, any>
  }): Post {
    return {
      platformPostId: data.platformPostId,
      url: data.url,
      title: data.title,
      content: data.content,
      authorName: data.authorName,
      authorUrl: data.authorUrl,
      mediaUrls: data.mediaUrls || [],
      savedAt: data.savedAt,
      metadata: data.metadata || {}
    }
  }
}
