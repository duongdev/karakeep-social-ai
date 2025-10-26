/**
 * Prisma Models Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import {
  testPrisma,
  cleanDatabase,
  disconnectDatabase,
} from '../helpers/test-db.js'

describe('Prisma Models', () => {
  beforeAll(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await cleanDatabase()
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  describe('Account Model', () => {
    it('should create an account', async () => {
      const account = await testPrisma.account.create({
        data: {
          platform: 'github',
          username: 'testuser',
          authType: 'token',
          credentials: { token: 'test-token' },
        },
      })

      expect(account).toBeDefined()
      expect(account.id).toBeDefined()
      expect(account.platform).toBe('github')
      expect(account.username).toBe('testuser')
      expect(account.authType).toBe('token')
      expect(account.isActive).toBe(true)
    })

    it('should find an account by id', async () => {
      const created = await testPrisma.account.create({
        data: {
          platform: 'twitter',
          authType: 'oauth',
          credentials: { token: 'oauth-token' },
        },
      })

      const found = await testPrisma.account.findUnique({
        where: { id: created.id },
      })

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
    })

    it('should update an account', async () => {
      const account = await testPrisma.account.create({
        data: {
          platform: 'reddit',
          authType: 'oauth',
          credentials: { token: 'reddit-token' },
        },
      })

      const updated = await testPrisma.account.update({
        where: { id: account.id },
        data: { username: 'newusername' },
      })

      expect(updated.username).toBe('newusername')
    })

    it('should delete an account', async () => {
      const account = await testPrisma.account.create({
        data: {
          platform: 'youtube',
          authType: 'oauth',
          credentials: { token: 'youtube-token' },
        },
      })

      await testPrisma.account.delete({
        where: { id: account.id },
      })

      const found = await testPrisma.account.findUnique({
        where: { id: account.id },
      })

      expect(found).toBeNull()
    })
  })

  describe('Bookmark Model', () => {
    let testAccount: any

    beforeEach(async () => {
      testAccount = await testPrisma.account.create({
        data: {
          platform: 'github',
          authType: 'token',
          credentials: { token: 'test' },
        },
      })
    })

    it('should create a bookmark', async () => {
      const bookmark = await testPrisma.bookmark.create({
        data: {
          accountId: testAccount.id,
          platform: 'github',
          platformPostId: 'repo-123',
          url: 'https://github.com/user/repo',
          title: 'Test Repo',
          content: 'A test repository',
          authorName: 'testuser',
        },
      })

      expect(bookmark).toBeDefined()
      expect(bookmark.id).toBeDefined()
      expect(bookmark.accountId).toBe(testAccount.id)
      expect(bookmark.platform).toBe('github')
      expect(bookmark.title).toBe('Test Repo')
    })

    it('should enforce unique constraint on platform + platformPostId + accountId', async () => {
      const data = {
        accountId: testAccount.id,
        platform: 'github',
        platformPostId: 'duplicate-123',
        url: 'https://github.com/user/repo',
      }

      await testPrisma.bookmark.create({ data })

      await expect(
        testPrisma.bookmark.create({ data })
      ).rejects.toThrow()
    })

    it('should cascade delete bookmarks when account is deleted', async () => {
      await testPrisma.bookmark.create({
        data: {
          accountId: testAccount.id,
          platform: 'github',
          platformPostId: 'cascade-test',
          url: 'https://github.com/user/repo',
        },
      })

      await testPrisma.account.delete({
        where: { id: testAccount.id },
      })

      const bookmarks = await testPrisma.bookmark.findMany({
        where: { accountId: testAccount.id },
      })

      expect(bookmarks).toHaveLength(0)
    })
  })

  describe('Tag Model', () => {
    it('should create a tag', async () => {
      const tag = await testPrisma.tag.create({
        data: {
          name: 'typescript',
          color: '#3178C6',
        },
      })

      expect(tag).toBeDefined()
      expect(tag.name).toBe('typescript')
      expect(tag.color).toBe('#3178C6')
    })

    it('should enforce unique tag names', async () => {
      await testPrisma.tag.create({
        data: { name: 'javascript' },
      })

      await expect(
        testPrisma.tag.create({
          data: { name: 'javascript' },
        })
      ).rejects.toThrow()
    })
  })

  describe('List Model', () => {
    it('should create a list', async () => {
      const list = await testPrisma.list.create({
        data: {
          name: 'Tutorials',
          description: 'Learning resources',
          color: '#FF5733',
        },
      })

      expect(list).toBeDefined()
      expect(list.name).toBe('Tutorials')
      expect(list.description).toBe('Learning resources')
    })
  })

  describe('Relationships', () => {
    it('should create bookmark with tags', async () => {
      const account = await testPrisma.account.create({
        data: {
          platform: 'github',
          authType: 'token',
          credentials: { token: 'test' },
        },
      })

      const bookmark = await testPrisma.bookmark.create({
        data: {
          accountId: account.id,
          platform: 'github',
          platformPostId: 'rel-test-1',
          url: 'https://github.com/user/repo',
          tags: {
            create: [
              {
                tag: {
                  create: { name: 'react' },
                },
                confidence: 0.95,
              },
            ],
          },
        },
        include: { tags: { include: { tag: true } } },
      })

      expect(bookmark.tags).toHaveLength(1)
      expect(bookmark.tags[0].tag.name).toBe('react')
      expect(bookmark.tags[0].confidence).toBe(0.95)
    })

    it('should create bookmark with AI analysis', async () => {
      const account = await testPrisma.account.create({
        data: {
          platform: 'github',
          authType: 'token',
          credentials: { token: 'test' },
        },
      })

      const bookmark = await testPrisma.bookmark.create({
        data: {
          accountId: account.id,
          platform: 'github',
          platformPostId: 'ai-test-1',
          url: 'https://github.com/user/repo',
          aiAnalysis: {
            create: {
              summary: 'A TypeScript library',
              topics: ['typescript', 'library'],
              sentiment: 'positive',
              language: 'en',
            },
          },
        },
        include: { aiAnalysis: true },
      })

      expect(bookmark.aiAnalysis).toBeDefined()
      expect(bookmark.aiAnalysis?.summary).toBe('A TypeScript library')
    })
  })
})
