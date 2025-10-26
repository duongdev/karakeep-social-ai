/**
 * Twitter/X Adapter Types
 *
 * Type definitions for Twitter API v2 data structures
 */

/**
 * Twitter OAuth 2.0 credentials
 */
export interface TwitterCredentials {
  /**
   * OAuth 2.0 Bearer Token (can be used directly)
   */
  bearerToken?: string

  /**
   * OAuth 2.0 Access Token (from PKCE flow)
   */
  accessToken?: string

  /**
   * Optional: Refresh token for getting new access tokens
   */
  refreshToken?: string

  /**
   * Optional: Client ID for OAuth 2.0 PKCE flow
   */
  clientId?: string

  /**
   * Optional: Client Secret
   */
  clientSecret?: string
}

/**
 * Twitter API v2 pagination meta
 */
export interface TwitterPaginationMeta {
  next_token?: string
  previous_token?: string
  result_count: number
}

/**
 * Twitter API v2 response wrapper
 */
export interface TwitterResponse<T> {
  data?: T[]
  includes?: TwitterIncludes
  meta?: TwitterPaginationMeta
  errors?: Array<{
    message: string
    type: string
  }>
}

/**
 * Twitter includes (expansions)
 */
export interface TwitterIncludes {
  users?: TwitterUser[]
  media?: TwitterMedia[]
  polls?: any[]
  places?: any[]
  tweets?: TwitterTweet[]
}

/**
 * Twitter User object
 */
export interface TwitterUser {
  id: string
  name: string
  username: string
  profile_image_url?: string
  description?: string
  verified?: boolean
  created_at?: string
}

/**
 * Twitter Tweet object (v2 API)
 */
export interface TwitterTweet {
  id: string
  text: string
  author_id?: string
  created_at?: string
  conversation_id?: string
  in_reply_to_user_id?: string
  referenced_tweets?: Array<{
    type: 'retweeted' | 'quoted' | 'replied_to'
    id: string
  }>
  attachments?: {
    media_keys?: string[]
    poll_ids?: string[]
  }
  entities?: {
    hashtags?: Array<{ tag: string }>
    urls?: Array<{
      url: string
      expanded_url: string
      display_url: string
      unwound_url?: string
    }>
    mentions?: Array<{
      username: string
      id: string
    }>
  }
  public_metrics?: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
    bookmark_count?: number
    impression_count?: number
  }
  possibly_sensitive?: boolean
  lang?: string
}

/**
 * Twitter Media object
 */
export interface TwitterMedia {
  media_key: string
  type: 'photo' | 'video' | 'animated_gif'
  url?: string
  preview_image_url?: string
  width?: number
  height?: number
  duration_ms?: number
  variants?: Array<{
    bit_rate?: number
    content_type: string
    url: string
  }>
}

/**
 * Tweet field sets for API requests
 */
export const TWEET_FIELDS = [
  'id',
  'text',
  'author_id',
  'created_at',
  'conversation_id',
  'in_reply_to_user_id',
  'referenced_tweets',
  'attachments',
  'entities',
  'public_metrics',
  'possibly_sensitive',
  'lang'
].join(',')

export const USER_FIELDS = [
  'id',
  'name',
  'username',
  'profile_image_url',
  'description',
  'verified',
  'created_at'
].join(',')

export const MEDIA_FIELDS = [
  'media_key',
  'type',
  'url',
  'preview_image_url',
  'width',
  'height',
  'duration_ms',
  'variants'
].join(',')

export const EXPANSIONS = [
  'author_id',
  'referenced_tweets.id',
  'attachments.media_keys',
  'referenced_tweets.id.author_id'
].join(',')

/**
 * Type guard to check if tweet is a retweet
 */
export function isRetweet(tweet: TwitterTweet): boolean {
  return tweet.referenced_tweets?.some(ref => ref.type === 'retweeted') ?? false
}

/**
 * Type guard to check if tweet is a quote tweet
 */
export function isQuoteTweet(tweet: TwitterTweet): boolean {
  return tweet.referenced_tweets?.some(ref => ref.type === 'quoted') ?? false
}

/**
 * Type guard to check if tweet is a reply
 */
export function isReply(tweet: TwitterTweet): boolean {
  return tweet.referenced_tweets?.some(ref => ref.type === 'replied_to') ?? false
}
