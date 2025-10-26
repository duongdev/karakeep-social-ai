/**
 * Twitter/X Platform Adapter
 *
 * Adapter for fetching bookmarks and retweets from Twitter/X
 */

import { BaseAdapter } from '../base'
import { AuthType, type Post } from '../types'
import { TwitterAPIClient } from './api-client'
import {
  type TwitterCredentials,
  type TwitterTweet,
  type TwitterUser,
  type TwitterMedia,
  type TwitterIncludes,
  isRetweet
} from './types'

/**
 * Twitter/X Adapter
 *
 * Fetches bookmarked tweets and user retweets using OAuth 2.0
 */
export class TwitterAdapter extends BaseAdapter {
  readonly platform = 'twitter'
  private client: TwitterAPIClient
  private userId?: string

  constructor(credentials: TwitterCredentials, config?: any) {
    super(credentials, config)

    // Validate that we have at least one auth method
    if (!credentials.bearerToken && !credentials.accessToken) {
      throw new Error(
        'Twitter credentials must include either bearerToken or accessToken'
      )
    }

    this.client = new TwitterAPIClient(credentials)
  }

  /**
   * Authenticate with Twitter
   */
  async authenticate(credentials: TwitterCredentials): Promise<boolean> {
    try {
      const client = new TwitterAPIClient(credentials)

      // Try to get user info to verify authentication
      const response = await client.getMe()

      if (response.data && response.data.length > 0) {
        return true
      }

      return false
    } catch (error) {
      this.log('Authentication failed', error)
      return false
    }
  }

  /**
   * Validate current credentials
   */
  async validateCredentials(): Promise<boolean> {
    try {
      const response = await this.client.getMe()
      return response.data && response.data.length > 0
    } catch (error) {
      this.log('Credential validation failed', error)
      return false
    }
  }

  /**
   * Get supported authentication types
   */
  getSupportedAuthTypes(): AuthType[] {
    return [AuthType.OAUTH2, AuthType.BEARER_TOKEN]
  }

  /**
   * Get authenticated user ID (lazy load)
   */
  private async getUserId(): Promise<string> {
    if (this.userId) {
      return this.userId
    }

    const response = await this.client.getMe()
    if (!response.data || response.data.length === 0) {
      throw new Error('Failed to get user information')
    }

    this.userId = response.data[0].id
    return this.userId
  }

  /**
   * Fetch saved posts (bookmarks + retweets)
   *
   * @param since Optional date to fetch posts since
   */
  async fetchSavedPosts(since?: Date): Promise<Post[]> {
    this.log('Starting to fetch saved posts', { since })

    const allPosts: Post[] = []

    try {
      // Get user ID first
      const userId = await this.getUserId()

      // Fetch bookmarks
      this.log('Fetching bookmarks')
      const bookmarks = await this.fetchBookmarks(userId, since)
      allPosts.push(...bookmarks)

      // Fetch user tweets (filtered for retweets)
      this.log('Fetching retweets')
      const retweets = await this.fetchRetweets(userId, since)
      allPosts.push(...retweets)

      this.log('Fetch complete', {
        totalPosts: allPosts.length,
        bookmarks: bookmarks.length,
        retweets: retweets.length
      })

      return allPosts
    } catch (error) {
      this.handleError(error, 'fetchSavedPosts')
    }
  }

  /**
   * Fetch bookmarked tweets
   */
  private async fetchBookmarks(
    userId: string,
    since?: Date
  ): Promise<Post[]> {
    const posts: Post[] = []
    let paginationToken: string | undefined
    let pageCount = 0
    const maxPages = 80 // Safety limit (80 pages * 100 tweets = 8,000 max)

    while (pageCount < maxPages) {
      pageCount++
      this.log(`Fetching bookmarks page ${pageCount}`, { paginationToken })

      const response = await this.retryWithBackoff(
        () => this.client.getBookmarks(userId, 100, paginationToken)
      )

      if (!response.data || response.data.length === 0) {
        this.log('No more bookmarks to fetch')
        break
      }

      for (const tweet of response.data) {
        // Check if we've reached tweets older than 'since' date
        if (since && tweet.created_at) {
          const tweetDate = new Date(tweet.created_at)
          if (tweetDate < since) {
            this.log('Reached bookmarks older than since date', { since })
            return posts
          }
        }

        const post = this.mapTweetToPost(tweet, response.includes, 'bookmark')
        if (post) {
          posts.push(post)
        }
      }

      // Get next page token
      paginationToken = response.meta?.next_token

      if (!paginationToken) {
        this.log('No more bookmark pages available')
        break
      }

      // Rate limiting: Twitter allows 50 requests per 15 minutes for bookmarks
      // Wait 18 seconds between requests to stay under limit (50 req / 15 min = ~3.3 req/min)
      await this.rateLimit(18000)
    }

    return posts
  }

  /**
   * Fetch user retweets
   */
  private async fetchRetweets(
    userId: string,
    since?: Date
  ): Promise<Post[]> {
    const posts: Post[] = []
    let paginationToken: string | undefined
    let sinceId: string | undefined
    let pageCount = 0
    const maxPages = 32 // 3200 tweets max from API / 100 per page

    // If we have a since date, we could use it to calculate sinceId
    // For now, we'll fetch and filter

    while (pageCount < maxPages) {
      pageCount++
      this.log(`Fetching user tweets page ${pageCount}`, { paginationToken })

      const response = await this.retryWithBackoff(
        () => this.client.getUserTweets(userId, 100, paginationToken, sinceId)
      )

      if (!response.data || response.data.length === 0) {
        this.log('No more user tweets to fetch')
        break
      }

      for (const tweet of response.data) {
        // Only include retweets
        if (!isRetweet(tweet)) {
          continue
        }

        // Check if we've reached tweets older than 'since' date
        if (since && tweet.created_at) {
          const tweetDate = new Date(tweet.created_at)
          if (tweetDate < since) {
            this.log('Reached retweets older than since date', { since })
            return posts
          }
        }

        const post = this.mapTweetToPost(tweet, response.includes, 'retweet')
        if (post) {
          posts.push(post)
        }
      }

      // Get next page token
      paginationToken = response.meta?.next_token

      if (!paginationToken) {
        this.log('No more user tweet pages available')
        break
      }

      // Rate limiting: Twitter allows 1500 requests per 15 minutes for user tweets
      // Wait 1 second between requests to be safe
      await this.rateLimit(1000)
    }

    return posts
  }

  /**
   * Map Twitter tweet to standard Post format
   */
  private mapTweetToPost(
    tweet: TwitterTweet,
    includes?: TwitterIncludes,
    sourceType: 'bookmark' | 'retweet' = 'bookmark'
  ): Post | null {
    try {
      // Get author info from includes
      const author = includes?.users?.find(u => u.id === tweet.author_id)

      // Extract media URLs
      const mediaUrls: string[] = []

      if (tweet.attachments?.media_keys && includes?.media) {
        for (const mediaKey of tweet.attachments.media_keys) {
          const media = includes.media.find(m => m.media_key === mediaKey)
          if (media) {
            mediaUrls.push(...this.extractMediaUrls(media))
          }
        }
      }

      // Extract URLs from entities
      const urls = tweet.entities?.urls || []
      const expandedUrls = urls
        .map(u => u.unwound_url || u.expanded_url)
        .filter(Boolean)

      return this.createPost({
        platformPostId: tweet.id,
        url: `https://twitter.com/i/web/status/${tweet.id}`,
        title: undefined, // Tweets don't have titles
        content: tweet.text,
        authorName: author?.name || author?.username || 'Unknown',
        authorUrl: author?.username
          ? `https://twitter.com/${author.username}`
          : '',
        mediaUrls,
        savedAt: tweet.created_at ? new Date(tweet.created_at) : new Date(),
        metadata: {
          sourceType, // 'bookmark' or 'retweet'
          author_id: tweet.author_id,
          author_username: author?.username,
          conversation_id: tweet.conversation_id,
          is_retweet: isRetweet(tweet),
          referenced_tweets: tweet.referenced_tweets,
          public_metrics: tweet.public_metrics,
          hashtags: tweet.entities?.hashtags?.map(h => h.tag) || [],
          mentions: tweet.entities?.mentions?.map(m => m.username) || [],
          expanded_urls: expandedUrls,
          lang: tweet.lang,
          possibly_sensitive: tweet.possibly_sensitive
        }
      })
    } catch (error) {
      this.log('Failed to map tweet', { tweet, error })
      return null
    }
  }

  /**
   * Extract media URLs from Twitter media object
   */
  private extractMediaUrls(media: TwitterMedia): string[] {
    const urls: string[] = []

    if (media.type === 'photo' && media.url) {
      urls.push(media.url)
    } else if (media.type === 'video' || media.type === 'animated_gif') {
      // Add preview image
      if (media.preview_image_url) {
        urls.push(media.preview_image_url)
      }

      // Add highest quality video variant
      if (media.variants) {
        const videoVariants = media.variants
          .filter(v => v.content_type.includes('video'))
          .sort((a, b) => (b.bit_rate || 0) - (a.bit_rate || 0))

        if (videoVariants.length > 0) {
          urls.push(videoVariants[0].url)
        }
      }
    }

    return urls
  }
}
