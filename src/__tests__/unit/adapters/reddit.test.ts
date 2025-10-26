/**
 * Reddit Adapter Tests
 *
 * Unit tests for the Reddit adapter
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { RedditAdapter } from '../../../adapters/reddit'
import { AuthType } from '../../../adapters/types'
import type { RedditCredentials } from '../../../adapters/reddit/types'
import { isSubmission, isComment } from '../../../adapters/reddit/types'

// Mock credentials for testing
const mockCredentials: RedditCredentials = {
  clientId: 'test_client_id',
  clientSecret: 'test_client_secret',
  username: 'test_user',
  password: 'test_password'
}

describe('RedditAdapter', () => {
  let adapter: RedditAdapter

  beforeEach(() => {
    adapter = new RedditAdapter(mockCredentials, { debug: false })
  })

  describe('constructor', () => {
    it('should initialize with credentials', () => {
      expect(adapter).toBeInstanceOf(RedditAdapter)
      expect(adapter.platform).toBe('reddit')
    })

    it('should throw when missing required credentials', () => {
      expect(() => {
        new RedditAdapter({} as RedditCredentials)
      }).toThrow('Missing required credentials')
    })

    it('should throw when missing clientId', () => {
      expect(() => {
        new RedditAdapter({
          clientSecret: 'secret',
          username: 'user',
          password: 'pass'
        } as RedditCredentials)
      }).toThrow('clientId')
    })
  })

  describe('getSupportedAuthTypes', () => {
    it('should return OAuth2 and username/password', () => {
      const authTypes = adapter.getSupportedAuthTypes()

      expect(authTypes).toContain(AuthType.OAUTH2)
      expect(authTypes).toContain(AuthType.USERNAME_PASSWORD)
    })
  })

  describe('platform property', () => {
    it('should have platform set to reddit', () => {
      expect(adapter.platform).toBe('reddit')
    })
  })

  // Note: The following tests would require mocking the Reddit API
  // For now, we're testing the structure and interface

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
})

describe('RedditAdapter - Type Guards', () => {
  describe('isSubmission', () => {
    it('should return true for submission objects', () => {
      const submission = {
        title: 'Test Post',
        selftext: 'Content',
        id: '123',
        author: 'test'
      }

      expect(isSubmission(submission)).toBe(true)
    })

    it('should return false for comment objects', () => {
      const comment = {
        body: 'Test comment',
        link_title: 'Parent post',
        id: '456',
        author: 'test'
      }

      expect(isSubmission(comment)).toBe(false)
    })
  })

  describe('isComment', () => {
    it('should return true for comment objects', () => {
      const comment = {
        body: 'Test comment',
        link_title: 'Parent post',
        id: '456',
        author: 'test'
      }

      expect(isComment(comment)).toBe(true)
    })

    it('should return false for submission objects', () => {
      const submission = {
        title: 'Test Post',
        selftext: 'Content',
        id: '123',
        author: 'test'
      }

      expect(isComment(submission)).toBe(false)
    })
  })
})

describe('RedditAdapter - Data Mapping', () => {
  let adapter: RedditAdapter

  beforeEach(() => {
    adapter = new RedditAdapter(mockCredentials, { debug: false })
  })

  describe('mapSubmissionToPost', () => {
    it('should map submission with all fields', () => {
      const mockSubmission = {
        id: 'abc123',
        title: 'Test Submission',
        selftext: 'This is the content',
        author: 'testuser',
        permalink: '/r/test/comments/abc123/test_submission/',
        created_utc: 1704067200, // 2024-01-01 00:00:00
        subreddit: 'test',
        subreddit_name_prefixed: 'r/test',
        score: 42,
        num_comments: 10,
        is_video: false,
        over_18: false,
        url: 'https://reddit.com/r/test/comments/abc123'
      }

      const post = adapter['mapSubmissionToPost'](mockSubmission)

      expect(post.platformPostId).toBe('abc123')
      expect(post.title).toBe('Test Submission')
      expect(post.content).toBe('This is the content')
      expect(post.authorName).toBe('testuser')
      expect(post.authorUrl).toBe('https://reddit.com/u/testuser')
      expect(post.url).toContain('reddit.com')
      expect(post.metadata).toMatchObject({
        type: 'submission',
        subreddit: 'test',
        score: 42,
        num_comments: 10
      })
    })

    it('should extract media URLs from preview', () => {
      const mockSubmission = {
        id: 'img123',
        title: 'Image Post',
        selftext: '',
        author: 'testuser',
        permalink: '/r/test/comments/img123/image_post/',
        created_utc: 1704067200,
        subreddit: 'test',
        subreddit_name_prefixed: 'r/test',
        score: 10,
        num_comments: 2,
        is_video: false,
        over_18: false,
        url: 'https://i.redd.it/example.jpg',
        preview: {
          images: [
            {
              source: {
                url: 'https://preview.redd.it/example.jpg?width=1080&amp;format=jpg',
                width: 1080,
                height: 1080
              }
            }
          ]
        }
      }

      const post = adapter['mapSubmissionToPost'](mockSubmission)

      expect(post.mediaUrls.length).toBeGreaterThan(0)
      expect(post.mediaUrls.some(url => url.includes('preview.redd.it'))).toBe(
        true
      )
    })
  })

  describe('mapCommentToPost', () => {
    it('should map comment with all fields', () => {
      const mockComment = {
        id: 'xyz789',
        body: 'This is a test comment',
        author: 'commenter',
        permalink: '/r/test/comments/abc123/test_submission/xyz789/',
        created_utc: 1704067200,
        subreddit: 'test',
        score: 5,
        link_id: 't3_abc123',
        link_title: 'Original Post Title',
        link_url: 'https://reddit.com/r/test/comments/abc123',
        link_permalink: '/r/test/comments/abc123/original_post/'
      }

      const post = adapter['mapCommentToPost'](mockComment)

      expect(post.platformPostId).toBe('xyz789')
      expect(post.title).toContain('Comment on:')
      expect(post.title).toContain('Original Post Title')
      expect(post.content).toBe('This is a test comment')
      expect(post.authorName).toBe('commenter')
      expect(post.authorUrl).toBe('https://reddit.com/u/commenter')
      expect(post.metadata).toMatchObject({
        type: 'comment',
        subreddit: 'test',
        score: 5,
        link_title: 'Original Post Title'
      })
    })
  })
})
