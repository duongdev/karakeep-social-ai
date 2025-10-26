/**
 * Twitter/X API Client
 *
 * HTTP client for interacting with Twitter API v2
 */

import {
  type TwitterCredentials,
  type TwitterResponse,
  type TwitterTweet,
  TWEET_FIELDS,
  USER_FIELDS,
  MEDIA_FIELDS,
  EXPANSIONS,
} from "./types";

/**
 * Twitter API Client
 *
 * Handles authentication and API requests to Twitter API v2
 */
export class TwitterAPIClient {
  private readonly baseURL = "https://api.x.com/2";
  private readonly token: string;

  constructor(credentials: TwitterCredentials) {
    // Prefer access token from OAuth 2.0 PKCE, fall back to bearer token
    this.token = credentials.accessToken || credentials.bearerToken || "";

    if (!this.token) {
      throw new Error(
        "Twitter credentials must include either accessToken or bearerToken",
      );
    }
  }

  /**
   * Make an authenticated request to Twitter API
   */
  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<TwitterResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Twitter API error: ${response.status} ${response.statusText} - ${error}`,
      );
    }

    return response.json() as Promise<TwitterResponse<T>>;
  }

  /**
   * Get user's bookmarked tweets
   *
   * @param userId User ID
   * @param maxResults Max results per page (default: 100, max: 100)
   * @param paginationToken Pagination token for next page
   */
  async getBookmarks(
    userId: string,
    maxResults: number = 100,
    paginationToken?: string,
  ): Promise<TwitterResponse<TwitterTweet>> {
    const params: Record<string, string> = {
      max_results: Math.min(maxResults, 100).toString(),
      "tweet.fields": TWEET_FIELDS,
      "user.fields": USER_FIELDS,
      "media.fields": MEDIA_FIELDS,
      expansions: EXPANSIONS,
    };

    if (paginationToken) {
      params.pagination_token = paginationToken;
    }

    return this.makeRequest<TwitterTweet>(`/users/${userId}/bookmarks`, params);
  }

  /**
   * Get user's tweets (includes retweets)
   *
   * @param userId User ID
   * @param maxResults Max results per page (default: 100, max: 100)
   * @param paginationToken Pagination token for next page
   * @param sinceId Only return tweets created after this tweet ID
   */
  async getUserTweets(
    userId: string,
    maxResults: number = 100,
    paginationToken?: string,
    sinceId?: string,
  ): Promise<TwitterResponse<TwitterTweet>> {
    const params: Record<string, string> = {
      max_results: Math.min(maxResults, 100).toString(),
      "tweet.fields": TWEET_FIELDS,
      "user.fields": USER_FIELDS,
      "media.fields": MEDIA_FIELDS,
      expansions: EXPANSIONS,
    };

    if (paginationToken) {
      params.pagination_token = paginationToken;
    }

    if (sinceId) {
      params.since_id = sinceId;
    }

    return this.makeRequest<TwitterTweet>(`/users/${userId}/tweets`, params);
  }

  /**
   * Get authenticated user information
   */
  async getMe(): Promise<TwitterResponse<any>> {
    return this.makeRequest("/users/me", {
      "user.fields": USER_FIELDS,
    });
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<TwitterResponse<any>> {
    return this.makeRequest(`/users/by/username/${username}`, {
      "user.fields": USER_FIELDS,
    });
  }
}
