-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('CRON', 'MANUAL', 'WEBHOOK');

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "username" TEXT,
    "authType" TEXT NOT NULL,
    "credentials" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "platformPostId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT,
    "authorName" TEXT,
    "authorUrl" TEXT,
    "mediaUrls" JSONB,
    "metadata" JSONB,
    "savedAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analysis" (
    "id" TEXT NOT NULL,
    "bookmarkId" TEXT NOT NULL,
    "summary" TEXT,
    "keyPoints" JSONB,
    "topics" JSONB,
    "sentiment" TEXT,
    "language" TEXT,
    "transcript" TEXT,
    "duration" INTEGER,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelUsed" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmark_lists" (
    "bookmarkId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmark_lists_pkey" PRIMARY KEY ("bookmarkId","listId")
);

-- CreateTable
CREATE TABLE "bookmark_tags" (
    "bookmarkId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookmark_tags_pkey" PRIMARY KEY ("bookmarkId","tagId")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "TriggerType" NOT NULL,
    "itemsSynced" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bookmarks_accountId_idx" ON "bookmarks"("accountId");

-- CreateIndex
CREATE INDEX "bookmarks_platform_idx" ON "bookmarks"("platform");

-- CreateIndex
CREATE INDEX "bookmarks_savedAt_idx" ON "bookmarks"("savedAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_platform_platformPostId_accountId_key" ON "bookmarks"("platform", "platformPostId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_bookmarkId_key" ON "ai_analysis"("bookmarkId");

-- CreateIndex
CREATE INDEX "ai_analysis_bookmarkId_idx" ON "ai_analysis"("bookmarkId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "bookmark_tags_tagId_idx" ON "bookmark_tags"("tagId");

-- CreateIndex
CREATE INDEX "sync_jobs_accountId_idx" ON "sync_jobs"("accountId");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- CreateIndex
CREATE INDEX "sync_jobs_createdAt_idx" ON "sync_jobs"("createdAt");

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "bookmarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_lists" ADD CONSTRAINT "bookmark_lists_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "bookmarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_lists" ADD CONSTRAINT "bookmark_lists_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_bookmarkId_fkey" FOREIGN KEY ("bookmarkId") REFERENCES "bookmarks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmark_tags" ADD CONSTRAINT "bookmark_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_jobs" ADD CONSTRAINT "sync_jobs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
