/**
 * Platform Adapters
 *
 * Main export file for the adapter system
 */

// Core exports
export { BaseAdapter, type PlatformAdapter } from './base'
export { AdapterRegistry, adapterRegistry, createAdapter, isPlatformSupported, getSupportedPlatforms } from './registry'

// Types
export {
  AuthType,
  type Post,
  type PaginationCursor,
  type PaginatedResponse,
  type RateLimitInfo,
  type AdapterConfig,
  type WebhookConfig
} from './types'

// Errors
export {
  AdapterError,
  AuthenticationError,
  RateLimitError,
  ResourceNotFoundError,
  NetworkError,
  DataValidationError,
  ServiceUnavailableError,
  QuotaExceededError,
  UnsupportedOperationError
} from './errors'

// Platform adapters will be imported and registered here as they are implemented
// Example:
// import { TwitterAdapter } from './twitter'
// import { RedditAdapter } from './reddit'
// import { GitHubAdapter } from './github'
//
// adapterRegistry.register('twitter', {
//   displayName: 'Twitter / X',
//   description: 'Twitter bookmarks and saved tweets',
//   supportedAuthTypes: [AuthType.OAUTH2, AuthType.BEARER_TOKEN],
//   requiresWebhookSupport: false,
//   adapterClass: TwitterAdapter
// })
