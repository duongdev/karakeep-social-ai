/**
 * Platform Adapter Types
 *
 * Common types and interfaces for all platform adapters
 */

/**
 * Supported authentication types across platforms
 */
export enum AuthType {
  OAUTH2 = 'oauth2',
  API_TOKEN = 'api_token',
  BEARER_TOKEN = 'bearer_token',
  COOKIE = 'cookie',
  USERNAME_PASSWORD = 'username_password',
  PAT = 'pat' // Personal Access Token (GitHub)
}

/**
 * Standardized post data structure
 * All adapters must map platform-specific data to this format
 */
export interface Post {
  /**
   * Unique post ID on the platform
   */
  platformPostId: string

  /**
   * Direct URL to the post
   */
  url: string

  /**
   * Post title (if applicable, e.g., Reddit, GitHub)
   */
  title?: string

  /**
   * Post content/text/description
   */
  content: string

  /**
   * Author/creator name or display name
   */
  authorName: string

  /**
   * URL to author's profile
   */
  authorUrl: string

  /**
   * Array of media URLs (images, videos, gifs)
   */
  mediaUrls: string[]

  /**
   * When the post was saved/bookmarked on the platform
   */
  savedAt: Date

  /**
   * Platform-specific metadata for future use
   * Examples: likes, shares, comments count, hashtags, etc.
   */
  metadata: Record<string, any>
}

/**
 * Pagination cursor for fetching large datasets
 */
export interface PaginationCursor {
  next?: string
  previous?: string
  hasMore: boolean
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationCursor
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: Date
}

/**
 * Adapter configuration options
 */
export interface AdapterConfig {
  /**
   * Maximum retries for failed requests
   */
  maxRetries?: number

  /**
   * Timeout in milliseconds
   */
  timeout?: number

  /**
   * Rate limit settings
   */
  rateLimit?: {
    maxRequests: number
    windowMs: number
  }

  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Webhook configuration for platforms that support it
 */
export interface WebhookConfig {
  url: string
  secret?: string
  events?: string[]
}
