/**
 * Reddit Platform Adapter
 *
 * Adapter for fetching saved posts and comments from Reddit
 */

import { BaseAdapter } from "../base";
import { AuthType, type Post } from "../types";
import { RedditAPIClient } from "./api-client";
import {
  type RedditCredentials,
  type RedditSavedItem,
  isSubmission,
  isComment,
} from "./types";

/**
 * Reddit Adapter
 *
 * Fetches saved posts and comments from Reddit using OAuth2 authentication
 */
export class RedditAdapter extends BaseAdapter {
  readonly platform = "reddit";
  private client: RedditAPIClient;

  constructor(credentials: RedditCredentials, config?: any) {
    super(credentials, config);

    // Validate required credentials
    this.validateRequiredCredentials([
      "clientId",
      "clientSecret",
      "username",
      "password",
    ]);

    this.client = new RedditAPIClient(
      credentials,
      "Karakeep/1.0.0 (by /u/karakeep)",
    );
  }

  /**
   * Authenticate with Reddit using OAuth2 password flow
   */
  async authenticate(credentials: RedditCredentials): Promise<boolean> {
    try {
      const client = new RedditAPIClient(
        credentials,
        "Karakeep/1.0.0 (by /u/karakeep)",
      );

      await client.authenticate();

      // Try to get user info to verify authentication
      await client.getUserInfo();

      return true;
    } catch (error) {
      this.log("Authentication failed", error);
      return false;
    }
  }

  /**
   * Validate that current credentials are still valid
   */
  async validateCredentials(): Promise<boolean> {
    try {
      await this.client.getUserInfo();
      return true;
    } catch (error) {
      this.log("Credential validation failed", error);
      return false;
    }
  }

  /**
   * Get supported authentication types
   */
  getSupportedAuthTypes(): AuthType[] {
    return [AuthType.OAUTH2, AuthType.USERNAME_PASSWORD];
  }

  /**
   * Fetch saved posts from Reddit
   *
   * @param since Optional date to fetch posts since (for incremental sync)
   */
  async fetchSavedPosts(since?: Date): Promise<Post[]> {
    this.log("Starting to fetch saved posts", { since });

    const allPosts: Post[] = [];
    let after: string | undefined;
    let pageCount = 0;
    const maxPages = 100; // Safety limit (100 pages * 100 items = 10,000 items max)

    try {
      // Paginate through all saved items
      while (pageCount < maxPages) {
        pageCount++;
        this.log(`Fetching page ${pageCount}`, { after });

        const listing = await this.retryWithBackoff(() =>
          this.client.getSavedPosts(100, after),
        );

        if (!listing.data.children || listing.data.children.length === 0) {
          this.log("No more items to fetch");
          break;
        }

        for (const child of listing.data.children) {
          const item = child.data;

          // Check if we've reached items older than 'since' date
          if (since) {
            const itemDate = new Date(item.created_utc * 1000);
            if (itemDate < since) {
              this.log("Reached items older than since date", { since });
              return allPosts;
            }
          }

          // Map Reddit item to standard Post format
          const post = this.mapRedditItemToPost(item);
          if (post) {
            allPosts.push(post);
          }
        }

        // Get next page cursor
        after = listing.data.after ?? undefined;

        if (!after) {
          this.log("No more pages available");
          break;
        }

        // Rate limiting: Reddit allows 100 requests per minute
        // Wait 600ms between requests to stay under limit
        await this.rateLimit(600);
      }

      this.log("Fetch complete", {
        totalPosts: allPosts.length,
        pages: pageCount,
      });

      return allPosts;
    } catch (error) {
      this.handleError(error, "fetchSavedPosts");
    }
  }

  /**
   * Map Reddit saved item (submission or comment) to standard Post format
   */
  private mapRedditItemToPost(item: RedditSavedItem): Post | null {
    try {
      if (isSubmission(item)) {
        return this.mapSubmissionToPost(item);
      } else if (isComment(item)) {
        return this.mapCommentToPost(item);
      }

      this.log("Unknown item type", item);
      return null;
    } catch (error) {
      this.log("Failed to map item", { item, error });
      return null;
    }
  }

  /**
   * Map Reddit submission to Post
   */
  private mapSubmissionToPost(submission: any): Post {
    // Extract media URLs
    const mediaUrls: string[] = [];

    // Add thumbnail if available
    if (submission.thumbnail && submission.thumbnail.startsWith("http")) {
      mediaUrls.push(submission.thumbnail);
    }

    // Add preview images
    if (submission.preview?.images) {
      for (const image of submission.preview.images) {
        if (image.source?.url) {
          // Decode HTML entities in URL
          const url = image.source.url.replace(/&amp;/g, "&");
          mediaUrls.push(url);
        }
      }
    }

    // Add Reddit video
    if (submission.media?.reddit_video?.fallback_url) {
      mediaUrls.push(submission.media.reddit_video.fallback_url);
    }

    // Add external URL if it's an image/video
    if (
      submission.url &&
      !submission.is_self &&
      /\.(jpg|jpeg|png|gif|webp|mp4|webm)$/i.test(submission.url)
    ) {
      mediaUrls.push(submission.url);
    }

    return this.createPost({
      platformPostId: submission.id,
      url: `https://reddit.com${submission.permalink}`,
      title: submission.title,
      content: submission.selftext || submission.url,
      authorName: submission.author,
      authorUrl: `https://reddit.com/u/${submission.author}`,
      mediaUrls: [...new Set(mediaUrls)], // Remove duplicates
      savedAt: new Date(submission.created_utc * 1000),
      metadata: {
        type: "submission",
        subreddit: submission.subreddit,
        subreddit_name_prefixed: submission.subreddit_name_prefixed,
        score: submission.score,
        num_comments: submission.num_comments,
        is_video: submission.is_video,
        over_18: submission.over_18,
        link_flair_text: submission.link_flair_text,
        awards: submission.all_awardings?.length || 0,
      },
    });
  }

  /**
   * Map Reddit comment to Post
   */
  private mapCommentToPost(comment: any): Post {
    return this.createPost({
      platformPostId: comment.id,
      url: `https://reddit.com${comment.permalink}`,
      title: `Comment on: ${comment.link_title}`,
      content: comment.body,
      authorName: comment.author,
      authorUrl: `https://reddit.com/u/${comment.author}`,
      mediaUrls: [], // Comments don't have direct media (could be in body)
      savedAt: new Date(comment.created_utc * 1000),
      metadata: {
        type: "comment",
        subreddit: comment.subreddit,
        score: comment.score,
        link_id: comment.link_id,
        link_title: comment.link_title,
        link_url: comment.link_url,
        link_permalink: comment.link_permalink,
        awards: comment.all_awardings?.length || 0,
      },
    });
  }
}
