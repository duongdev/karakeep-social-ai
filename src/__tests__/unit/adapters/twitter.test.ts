/**
 * Twitter/X Adapter Tests
 *
 * Unit tests for the Twitter adapter
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { TwitterAdapter } from '../../../adapters/twitter'
import { AuthType } from '../../../adapters/types'
import type { TwitterCredentials, TwitterTweet } from '../../../adapters/twitter/types'
import { isRetweet, isQuoteTweet, isReply } from '../../../adapters/twitter/types'

// Mock credentials for testing
const mockCredentials: TwitterCredentials = {
  bearerToken: 'test_bearer_token_xxx'
}

const mockAccessTokenCredentials: TwitterCredentials = {
  accessToken: 'test_access_token_xxx'
}

describe('TwitterAdapter', () => {
  let adapter: TwitterAdapter

  beforeEach(() => {
    adapter = new TwitterAdapter(mockCredentials, { debug: false })
  })

  describe('constructor', () => {
    it('should initialize with bearer token', () => {
      expect(adapter).toBeInstanceOf(TwitterAdapter)
      expect(adapter.platform).toBe('twitter')
    })

    it('should initialize with access token', () => {
      const adapterWithToken = new TwitterAdapter(mockAccessTokenCredentials)
      expect(adapterWithToken).toBeInstanceOf(TwitterAdapter)
    })

    it('should throw when missing credentials', () => {
      expect(() => {
        new TwitterAdapter({} as TwitterCredentials)
      }).toThrow('must include either bearerToken or accessToken')
    })
  })

  describe('getSupportedAuthTypes', () => {
    it('should return OAuth2 and Bearer Token', () => {
      const authTypes = adapter.getSupportedAuthTypes()

      expect(authTypes).toContain(AuthType.OAUTH2)
      expect(authTypes).toContain(AuthType.BEARER_TOKEN)
    })
  })

  describe('platform property', () => {
    it('should have platform set to twitter', () => {
      expect(adapter.platform).toBe('twitter')
    })
  })

  describe('authenticate', () => {
    it('should have authenticate method', () => {
      expect(typeof adapter.authenticate).toBe('function')
    })
  })

  describe('validateCredentials', () => {
    it('should have validateCredentials method', () => {
      expect(typeof adapter.validateCredentials).toBe('function')
    })
  })

  describe('fetchSavedPosts', () => {
    it('should have fetchSavedPosts method', () => {
      expect(typeof adapter.fetchSavedPosts).toBe('function')
    })
  })

  describe('extractMediaUrls', () => {
    it('should extract photo URL', () => {
      const mockMedia = {
        media_key: '123',
        type: 'photo' as const,
        url: 'https://pbs.twimg.com/media/example.jpg'
      }

      const urls = adapter['extractMediaUrls'](mockMedia)
      expect(urls).toContain('https://pbs.twimg.com/media/example.jpg')
      expect(urls).toHaveLength(1)
    })

    it('should extract video URLs with preview', () => {
      const mockMedia = {
        media_key: '456',
        type: 'video' as const,
        preview_image_url: 'https://pbs.twimg.com/media/preview.jpg',
        variants: [
          {
            bit_rate: 2176000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/example_high.mp4'
          },
          {
            bit_rate: 832000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/example_low.mp4'
          }
        ]
      }

      const urls = adapter['extractMediaUrls'](mockMedia)
      expect(urls).toContain('https://pbs.twimg.com/media/preview.jpg')
      expect(urls).toContain('https://video.twimg.com/example_high.mp4')
      expect(urls).toHaveLength(2)
    })

    it('should select highest bitrate video variant', () => {
      const mockMedia = {
        media_key: '789',
        type: 'video' as const,
        variants: [
          {
            bit_rate: 256000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/low.mp4'
          },
          {
            bit_rate: 2176000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/high.mp4'
          },
          {
            bit_rate: 832000,
            content_type: 'video/mp4',
            url: 'https://video.twimg.com/medium.mp4'
          }
        ]
      }

      const urls = adapter['extractMediaUrls'](mockMedia)
      expect(urls[0]).toBe('https://video.twimg.com/high.mp4')
    })
  })

  describe('mapTweetToPost', () => {
    it('should map tweet with all fields', () => {
      const mockTweet: TwitterTweet = {
        id: '1234567890',
        text: 'This is a test tweet #test',
        author_id: '123',
        created_at: '2024-01-01T12:00:00.000Z',
        conversation_id: '1234567890',
        entities: {
          hashtags: [{ tag: 'test' }]
        },
        public_metrics: {
          retweet_count: 10,
          reply_count: 5,
          like_count: 42,
          quote_count: 2
        },
        lang: 'en'
      }

      const mockIncludes = {
        users: [
          {
            id: '123',
            name: 'Test User',
            username: 'testuser'
          }
        ]
      }

      const post = adapter['mapTweetToPost'](mockTweet, mockIncludes, 'bookmark')

      expect(post?.platformPostId).toBe('1234567890')
      expect(post?.content).toBe('This is a test tweet #test')
      expect(post?.authorName).toBe('Test User')
      expect(post?.authorUrl).toBe('https://twitter.com/testuser')
      expect(post?.url).toContain('status/1234567890')
      expect(post?.metadata).toMatchObject({
        sourceType: 'bookmark',
        author_username: 'testuser',
        is_retweet: false,
        lang: 'en'
      })
      expect(post?.metadata.hashtags).toContain('test')
    })

    it('should handle tweet without author in includes', () => {
      const mockTweet: TwitterTweet = {
        id: '9876543210',
        text: 'Tweet without author',
        author_id: '999',
        created_at: '2024-01-01T12:00:00.000Z'
      }

      const post = adapter['mapTweetToPost'](mockTweet, undefined, 'retweet')

      expect(post?.authorName).toBe('Unknown')
      expect(post?.metadata.sourceType).toBe('retweet')
    })
  })
})

describe('TwitterAdapter - Type Guards', () => {
  describe('isRetweet', () => {
    it('should return true for retweets', () => {
      const tweet: TwitterTweet = {
        id: '123',
        text: 'RT @user: Original tweet',
        referenced_tweets: [
          { type: 'retweeted', id: '456' }
        ]
      }

      expect(isRetweet(tweet)).toBe(true)
    })

    it('should return false for original tweets', () => {
      const tweet: TwitterTweet = {
        id: '123',
        text: 'Original tweet'
      }

      expect(isRetweet(tweet)).toBe(false)
    })
  })

  describe('isQuoteTweet', () => {
    it('should return true for quote tweets', () => {
      const tweet: TwitterTweet = {
        id: '123',
        text: 'Quoting this tweet',
        referenced_tweets: [
          { type: 'quoted', id: '456' }
        ]
      }

      expect(isQuoteTweet(tweet)).toBe(true)
    })

    it('should return false for non-quote tweets', () => {
      const tweet: TwitterTweet = {
        id: '123',
        text: 'Original tweet'
      }

      expect(isQuoteTweet(tweet)).toBe(false)
    })
  })

  describe('isReply', () => {
    it('should return true for replies', () => {
      const tweet: TwitterTweet = {
        id: '123',
        text: '@user This is a reply',
        referenced_tweets: [
          { type: 'replied_to', id: '456' }
        ]
      }

      expect(isReply(tweet)).toBe(true)
    })

    it('should return false for non-replies', () => {
      const tweet: TwitterTweet = {
        id: '123',
        text: 'Original tweet'
      }

      expect(isReply(tweet)).toBe(false)
    })
  })
})
