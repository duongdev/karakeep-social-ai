/**
 * Test Database Utilities
 *
 * Helpers for setting up and tearing down test database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

/**
 * Clean all tables in the database
 */
export async function cleanDatabase() {
  const tables = [
    'bookmark_tags',
    'bookmark_lists',
    'sync_jobs',
    'ai_analysis',
    'bookmarks',
    'tags',
    'lists',
    'accounts',
  ]

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
}

/**
 * Seed test data
 */
export async function seedTestData() {
  // Create test account
  const account = await prisma.account.create({
    data: {
      platform: 'github',
      username: 'testuser',
      authType: 'token',
      credentials: { token: 'test-token' },
      isActive: true,
    },
  })

  // Create test bookmark
  const bookmark = await prisma.bookmark.create({
    data: {
      accountId: account.id,
      platform: 'github',
      platformPostId: 'test-repo-123',
      url: 'https://github.com/testuser/test-repo',
      title: 'Test Repository',
      content: 'A test repository for testing',
      authorName: 'testuser',
      authorUrl: 'https://github.com/testuser',
      savedAt: new Date(),
    },
  })

  // Create test list
  const list = await prisma.list.create({
    data: {
      name: 'Test List',
      description: 'A test list',
      color: '#FF0000',
    },
  })

  // Create test tag
  const tag = await prisma.tag.create({
    data: {
      name: 'test-tag',
      color: '#00FF00',
    },
  })

  return { account, bookmark, list, tag }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

export { prisma as testPrisma }
