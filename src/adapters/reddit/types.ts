/**
 * Reddit Adapter Types
 *
 * Type definitions for Reddit API data structures
 */

/**
 * Reddit OAuth2 credentials
 */
export interface RedditCredentials {
  /**
   * Reddit app client ID
   */
  clientId: string

  /**
   * Reddit app client secret
   */
  clientSecret: string

  /**
   * Reddit username
   */
  username: string

  /**
   * Reddit password
   */
  password: string

  /**
   * Optional: Access token (if already obtained)
   */
  accessToken?: string

  /**
   * Optional: Refresh token for getting new access tokens
   */
  refreshToken?: string

  /**
   * Optional: Token expiration timestamp
   */
  expiresAt?: number
}

/**
 * Reddit OAuth2 token response
 */
export interface RedditTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
  refresh_token?: string
}

/**
 * Reddit API listing response (generic wrapper)
 */
export interface RedditListing<T> {
  kind: 'Listing'
  data: {
    children: Array<{
      kind: string
      data: T
    }>
    after: string | null
    before: string | null
    dist: number
  }
}

/**
 * Reddit submission (post) data
 */
export interface RedditSubmission {
  id: string
  name: string // fullname (t3_xxxxx)
  subreddit: string
  subreddit_name_prefixed: string
  author: string
  title: string
  selftext: string
  url: string
  permalink: string
  created_utc: number
  score: number
  num_comments: number
  thumbnail?: string
  preview?: {
    images: Array<{
      source: {
        url: string
        width: number
        height: number
      }
      resolutions: Array<{
        url: string
        width: number
        height: number
      }>
    }>
  }
  media?: {
    reddit_video?: {
      fallback_url: string
      height: number
      width: number
      duration: number
    }
  }
  is_video: boolean
  all_awardings?: any[]
  link_flair_text?: string
  over_18: boolean
  saved?: boolean
}

/**
 * Reddit comment data
 */
export interface RedditComment {
  id: string
  name: string // fullname (t1_xxxxx)
  subreddit: string
  author: string
  body: string
  body_html: string
  link_id: string // parent submission fullname
  link_title: string
  link_permalink: string
  link_url: string
  permalink: string
  created_utc: number
  score: number
  all_awardings?: any[]
  saved?: boolean
}

/**
 * Union type for saved items (can be submission or comment)
 */
export type RedditSavedItem = RedditSubmission | RedditComment

/**
 * Type guard to check if item is a submission
 */
export function isSubmission(item: any): item is RedditSubmission {
  return 'title' in item && 'selftext' in item
}

/**
 * Type guard to check if item is a comment
 */
export function isComment(item: any): item is RedditComment {
  return 'body' in item && 'link_title' in item
}
