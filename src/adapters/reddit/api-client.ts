/**
 * Reddit API Client
 *
 * HTTP client for interacting with Reddit's OAuth2 API
 */

import {
  type RedditCredentials,
  type RedditTokenResponse,
  type RedditListing,
  type RedditSavedItem,
} from "./types";

/**
 * Reddit API Client
 *
 * Handles authentication and API requests to Reddit
 */
export class RedditAPIClient {
  private readonly baseURL = "https://oauth.reddit.com";
  private readonly authURL = "https://www.reddit.com/api/v1/access_token";
  private readonly userAgent: string;

  private accessToken?: string;
  private tokenExpiresAt?: number;

  constructor(
    private credentials: RedditCredentials,
    userAgent = "Karakeep/1.0.0",
  ) {
    this.userAgent = userAgent;

    // Use existing token if provided
    if (credentials.accessToken && credentials.expiresAt) {
      this.accessToken = credentials.accessToken;
      this.tokenExpiresAt = credentials.expiresAt;
    }
  }

  /**
   * Authenticate and get access token
   * Uses password grant flow for user authentication
   */
  async authenticate(): Promise<boolean> {
    try {
      // If token is still valid, no need to re-authenticate
      if (this.isTokenValid()) {
        return true;
      }

      const auth = Buffer.from(
        `${this.credentials.clientId}:${this.credentials.clientSecret}`,
      ).toString("base64");

      const body = new URLSearchParams({
        grant_type: "password",
        username: this.credentials.username,
        password: this.credentials.password,
      });

      const response = await fetch(this.authURL, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": this.userAgent,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Authentication failed: ${response.status} ${error}`);
      }

      const data = (await response.json()) as RedditTokenResponse;

      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;

      return true;
    } catch (error) {
      throw new Error(
        `Reddit authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check if current token is valid
   */
  private isTokenValid(): boolean {
    if (!this.accessToken || !this.tokenExpiresAt) {
      return false;
    }

    // Token is valid if it expires more than 5 minutes from now
    return this.tokenExpiresAt > Date.now() + 5 * 60 * 1000;
  }

  /**
   * Make an authenticated request to Reddit API
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    // Ensure we have a valid token
    if (!this.isTokenValid()) {
      await this.authenticate();
    }

    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `bearer ${this.accessToken}`,
        "User-Agent": this.userAgent,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Reddit API error: ${response.status} ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get saved posts for the authenticated user
   *
   * @param limit Number of items to fetch (max 100)
   * @param after Pagination cursor (fullname of last item)
   */
  async getSavedPosts(
    limit: number = 100,
    after?: string,
  ): Promise<RedditListing<RedditSavedItem>> {
    const params = new URLSearchParams({
      limit: Math.min(limit, 100).toString(),
      raw_json: "1", // Decode HTML entities in responses
    });

    if (after) {
      params.append("after", after);
    }

    return this.makeRequest<RedditListing<RedditSavedItem>>(
      `/user/me/saved?${params}`,
    );
  }

  /**
   * Get user information
   */
  async getUserInfo(): Promise<any> {
    return this.makeRequest("/api/v1/me");
  }

  /**
   * Get current access token (useful for persistence)
   */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): number | undefined {
    return this.tokenExpiresAt;
  }
}
