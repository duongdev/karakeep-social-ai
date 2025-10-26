/**
 * Platform Adapters
 *
 * Main export file for the adapter system
 */

// Core exports
export { BaseAdapter, type PlatformAdapter } from "./base";
export {
  AdapterRegistry,
  adapterRegistry,
  createAdapter,
  isPlatformSupported,
  getSupportedPlatforms,
} from "./registry";

// Types
export {
  AuthType,
  type Post,
  type PaginationCursor,
  type PaginatedResponse,
  type RateLimitInfo,
  type AdapterConfig,
  type WebhookConfig,
} from "./types";

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
  UnsupportedOperationError,
} from "./errors";

// Platform Adapters
import { RedditAdapter } from "./reddit";
import { TwitterAdapter } from "./twitter";
import { AuthType } from "./types";
import { adapterRegistry } from "./registry";

// Register platform adapters
adapterRegistry.register("reddit", {
  displayName: "Reddit",
  description: "Reddit saved posts and comments",
  supportedAuthTypes: [AuthType.OAUTH2, AuthType.USERNAME_PASSWORD],
  requiresWebhookSupport: false,
  adapterClass: RedditAdapter,
});

adapterRegistry.register("twitter", {
  displayName: "Twitter / X",
  description: "Twitter bookmarks and retweets",
  supportedAuthTypes: [AuthType.OAUTH2, AuthType.BEARER_TOKEN],
  requiresWebhookSupport: false,
  adapterClass: TwitterAdapter,
});

// Future platform adapters:
// - Twitter/X
// - GitHub
// - YouTube
// - TikTok
// - Dribbble
// - Instagram
// - Facebook
