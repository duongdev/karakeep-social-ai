/**
 * Platform Adapter Errors
 *
 * Standardized error types for adapter operations
 */

/**
 * Base adapter error class
 */
export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly platform: string,
    public readonly originalError?: any
  ) {
    super(message)
    this.name = 'AdapterError'
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Authentication failed or credentials invalid
 */
export class AuthenticationError extends AdapterError {
  constructor(platform: string, originalError?: any) {
    super(
      'Authentication failed. Please check your credentials.',
      'AUTH_FAILED',
      platform,
      originalError
    )
    this.name = 'AuthenticationError'
  }
}

/**
 * Rate limit exceeded
 */
export class RateLimitError extends AdapterError {
  constructor(
    platform: string,
    public readonly resetTime?: Date,
    originalError?: any
  ) {
    const resetMsg = resetTime
      ? ` Resets at ${resetTime.toISOString()}`
      : ''
    super(
      `Rate limit exceeded.${resetMsg}`,
      'RATE_LIMIT',
      platform,
      originalError
    )
    this.name = 'RateLimitError'
  }
}

/**
 * Resource not found (404)
 */
export class ResourceNotFoundError extends AdapterError {
  constructor(
    platform: string,
    resource: string,
    originalError?: any
  ) {
    super(
      `Resource not found: ${resource}`,
      'NOT_FOUND',
      platform,
      originalError
    )
    this.name = 'ResourceNotFoundError'
  }
}

/**
 * Network or connection error
 */
export class NetworkError extends AdapterError {
  constructor(platform: string, originalError?: any) {
    super(
      'Network error occurred. Please check your connection.',
      'NETWORK_ERROR',
      platform,
      originalError
    )
    this.name = 'NetworkError'
  }
}

/**
 * Invalid or malformed data from API
 */
export class DataValidationError extends AdapterError {
  constructor(
    platform: string,
    public readonly validationErrors: string[],
    originalError?: any
  ) {
    super(
      `Data validation failed: ${validationErrors.join(', ')}`,
      'VALIDATION_ERROR',
      platform,
      originalError
    )
    this.name = 'DataValidationError'
  }
}

/**
 * Platform API is unavailable or down
 */
export class ServiceUnavailableError extends AdapterError {
  constructor(platform: string, originalError?: any) {
    super(
      'Platform service is currently unavailable.',
      'SERVICE_UNAVAILABLE',
      platform,
      originalError
    )
    this.name = 'ServiceUnavailableError'
  }
}

/**
 * Quota or usage limit exceeded
 */
export class QuotaExceededError extends AdapterError {
  constructor(platform: string, quotaType: string, originalError?: any) {
    super(
      `Quota exceeded: ${quotaType}`,
      'QUOTA_EXCEEDED',
      platform,
      originalError
    )
    this.name = 'QuotaExceededError'
  }
}

/**
 * Unsupported operation for this adapter
 */
export class UnsupportedOperationError extends AdapterError {
  constructor(platform: string, operation: string) {
    super(
      `Operation '${operation}' is not supported by ${platform} adapter`,
      'UNSUPPORTED_OPERATION',
      platform
    )
    this.name = 'UnsupportedOperationError'
  }
}
