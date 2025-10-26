/**
 * Test Server Utilities
 *
 * Helpers for testing HTTP endpoints
 */

import { Hono } from 'hono'

/**
 * Create a test request
 */
export function createTestRequest(
  method: string,
  path: string,
  options: {
    headers?: Record<string, string>
    body?: unknown
  } = {}
) {
  const url = `http://localhost${path}`
  const init: RequestInit = {
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  }

  if (options.body) {
    init.body = JSON.stringify(options.body)
  }

  return new Request(url, init)
}

/**
 * Test a Hono app endpoint
 */
export async function testEndpoint(
  app: Hono,
  method: string,
  path: string,
  options: {
    headers?: Record<string, string>
    body?: unknown
  } = {}
) {
  const req = createTestRequest(method, path, options)
  const res = await app.fetch(req)

  let json: unknown = null
  try {
    json = await res.json()
  } catch (e) {
    // Response is not JSON
  }

  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    json,
    response: res,
  }
}

/**
 * Assert response is successful
 */
export function expectSuccess(response: { status: number; json: any }) {
  expect(response.status).toBeLessThan(400)
  expect(response.json).toHaveProperty('success', true)
  return response.json.data
}

/**
 * Assert response is an error
 */
export function expectError(
  response: { status: number; json: any },
  statusCode?: number
) {
  if (statusCode) {
    expect(response.status).toBe(statusCode)
  } else {
    expect(response.status).toBeGreaterThanOrEqual(400)
  }
  expect(response.json).toHaveProperty('success', false)
  expect(response.json).toHaveProperty('error')
  return response.json.error
}
