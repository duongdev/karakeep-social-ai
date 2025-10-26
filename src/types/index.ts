/**
 * Shared TypeScript Type Definitions
 */

// Response wrapper for API endpoints
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Pagination metadata
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Paginated response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationMeta
}

// Platform types
export type Platform =
  | 'twitter'
  | 'reddit'
  | 'github'
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'dribbble'
  | 'facebook'

// Authentication types
export type AuthType = 'token' | 'cookie' | 'oauth'

// Sentiment types
export type Sentiment = 'positive' | 'negative' | 'neutral' | 'mixed'

// Sync job status (mirrors Prisma enum)
export type SyncStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

// Trigger type (mirrors Prisma enum)
export type TriggerType = 'CRON' | 'MANUAL' | 'WEBHOOK'
