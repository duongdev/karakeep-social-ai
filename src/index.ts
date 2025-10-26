/**
 * Karakeep Social AI - Main Application
 *
 * AI-powered bookmark manager for social media content
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

import { env } from "./lib/env";
import { disconnect } from "./lib/db";
import healthRoutes from "./routes/health";

// Initialize Hono app
const app = new Hono();

// ============================================================================
// Middleware
// ============================================================================

app.use("*", logger());
app.use("*", prettyJSON());
app.use("*", cors());

// ============================================================================
// Routes
// ============================================================================

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "Karakeep Social AI",
    version: "0.1.0",
    description: "AI-powered bookmark manager for social media content",
    documentation: "https://github.com/yourusername/karakeep-social-ai",
    endpoints: {
      health: "/health",
      api: "/api",
    },
  });
});

// Mount route modules
app.route("/health", healthRoutes);

// API v1 routes (placeholder for future endpoints)
const api = new Hono();

api.get("/", (c) => {
  return c.json({
    message: "Karakeep API v1",
    endpoints: {
      accounts: "/api/accounts",
      bookmarks: "/api/bookmarks",
      lists: "/api/lists",
      tags: "/api/tags",
      sync: "/api/sync",
      ai: "/api/ai",
      search: "/api/search",
    },
  });
});

app.route("/api", api);

// ============================================================================
// Error Handling
// ============================================================================

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not Found",
      message: `Route ${c.req.path} not found`,
    },
    404,
  );
});

app.onError((err, c) => {
  console.error("Application error:", err);

  return c.json(
    {
      success: false,
      error: err.message || "Internal Server Error",
    },
    500,
  );
});

// ============================================================================
// Server Lifecycle
// ============================================================================

const port = parseInt(env.PORT);

console.log(`🚀 Karakeep Social AI starting...`);
console.log(`📝 Environment: ${env.NODE_ENV}`);
console.log(`🔌 Port: ${port}`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server running at http://localhost:${port}`);
console.log(`🏥 Health check: http://localhost:${port}/health`);
console.log(`📚 API docs: http://localhost:${port}/api`);

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);

  // Close database connection
  await disconnect();

  console.log("👋 Server shut down successfully");
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
