# Testing Guide

Comprehensive testing setup for Karakeep Social AI using Jest.

## 🎯 Test Coverage

**Current Status**: ✅ 36/36 tests passing

```
Test Suites: 4 passed, 4 total
Tests:       36 passed, 36 total
Coverage:    ~85% (estimated)
```

## 📁 Test Structure

```
src/__tests__/
├── setup.ts                    # Global test configuration
├── helpers/
│   ├── test-db.ts             # Database test utilities
│   └── test-server.ts         # HTTP endpoint test utilities
├── unit/
│   ├── env.test.ts            # Environment config tests
│   └── db.test.ts             # Database client tests
├── integration/
│   ├── health.test.ts         # API endpoint tests
│   └── models.test.ts         # Prisma model tests
└── e2e/
    └── (coming soon)          # End-to-end tests
```

## 🚀 Quick Start

### Run All Tests

```bash
npm test
```

### Run Tests by Type

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only (coming soon)
npm run test:e2e
```

### Watch Mode

```bash
# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch
```

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## 📋 Test Categories

### Unit Tests

Test individual functions and modules in isolation.

**Location**: `src/__tests__/unit/`

**Examples**:
- Environment variable validation
- Utility functions
- Pure business logic

**Run**: `npm run test:unit`

### Integration Tests

Test interaction between components and external services.

**Location**: `src/__tests__/integration/`

**Examples**:
- API endpoints
- Database operations
- Service interactions

**Run**: `npm run test:integration`

### E2E Tests (Coming Soon)

Test complete user workflows from start to finish.

**Location**: `src/__tests__/e2e/`

**Examples**:
- Full sync workflow
- Complete bookmark lifecycle
- AI analysis pipeline

**Run**: `npm run test:e2e`

## 🛠️ Writing Tests

### Test Template

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  })

  afterEach(() => {
    // Cleanup after each test
  })

  it('should do something specific', () => {
    // Arrange
    const input = 'test'

    // Act
    const result = doSomething(input)

    // Assert
    expect(result).toBe('expected')
  })
})
```

### Testing API Endpoints

```typescript
import { testEndpoint, expectSuccess } from '../helpers/test-server.js'
import healthRoutes from '../../routes/health.js'
import { Hono } from 'hono'

describe('GET /health', () => {
  const app = new Hono()
  app.route('/health', healthRoutes)

  it('should return health status', async () => {
    const res = await testEndpoint(app, 'GET', '/health')
    const data = expectSuccess(res)

    expect(data.status).toBe('healthy')
  })
})
```

### Testing Database Operations

```typescript
import { testPrisma, cleanDatabase } from '../helpers/test-db.js'

describe('Account Model', () => {
  beforeEach(async () => {
    await cleanDatabase()
  })

  it('should create an account', async () => {
    const account = await testPrisma.account.create({
      data: {
        platform: 'github',
        authType: 'token',
        credentials: { token: 'test' },
      },
    })

    expect(account.id).toBeDefined()
    expect(account.platform).toBe('github')
  })
})
```

## 🗄️ Test Database

### Setup

Tests use a separate `karakeep_test` database to avoid interfering with development data.

**Configuration**: Automatic via `src/__tests__/setup.ts`

**Database URL**:
```
postgresql://karakeep:karakeep_dev_password@localhost:5432/karakeep_test?schema=public
```

### Create Test Database

```bash
# Create test database (if not exists)
docker compose exec postgres psql -U karakeep -d postgres -c "CREATE DATABASE karakeep_test;"

# Run migrations on test database
DATABASE_URL="postgresql://karakeep:karakeep_dev_password@localhost:5432/karakeep_test?schema=public" \
  npx prisma migrate deploy
```

### Clean Test Data

The `cleanDatabase()` helper truncates all tables between tests:

```typescript
import { cleanDatabase } from '../helpers/test-db.js'

beforeEach(async () => {
  await cleanDatabase()
})
```

## 📊 Coverage Thresholds

Current coverage requirements (configured in `jest.config.js`):

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🔧 Test Utilities

### Database Helpers

**`cleanDatabase()`**
Truncate all tables for clean test state

**`seedTestData()`**
Create common test fixtures

**`disconnectDatabase()`**
Close database connection after tests

**`testPrisma`**
Prisma client configured for test database

### HTTP Testing Helpers

**`testEndpoint(app, method, path, options)`**
Test a Hono endpoint

**`expectSuccess(response)`**
Assert successful API response

**`expectError(response, statusCode?)`**
Assert error API response

## 🎭 Mocking

### Mock External APIs

```typescript
import { jest } from '@jest/globals'

// Mock Claude API
const mockClaude = {
  messages: {
    create: jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Mocked response' }],
    }),
  },
}
```

### Mock Environment Variables

```typescript
const originalEnv = process.env

beforeEach(() => {
  process.env = { ...originalEnv, TEST_VAR: 'test-value' }
})

afterEach(() => {
  process.env = originalEnv
})
```

## 🚨 Common Issues

### Port Already in Use

```bash
# Kill any process using test port 3001
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed

```bash
# Ensure Docker containers are running
docker compose ps

# Check test database exists
docker compose exec postgres psql -U karakeep -l | grep karakeep_test

# Recreate if needed
docker compose exec postgres psql -U karakeep -c "DROP DATABASE IF EXISTS karakeep_test;"
docker compose exec postgres psql -U karakeep -c "CREATE DATABASE karakeep_test;"
```

### Tests Timing Out

Increase timeout in `jest.config.js`:

```javascript
testTimeout: 10000, // 10 seconds
```

Or for specific tests:

```typescript
it('slow test', async () => {
  // test code
}, 15000) // 15 second timeout
```

### Module Resolution Errors

Make sure paths in `jest.config.js` match your TypeScript config:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

## 🔄 Continuous Integration

Tests run automatically on GitHub Actions for:
- Push to `main` or `develop` branches
- Pull requests

**Workflow**: `.github/workflows/ci.yml`

**Services**:
- PostgreSQL 16
- Redis 7

**Steps**:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Generate Prisma Client
5. Run migrations
6. Run tests with coverage
7. Upload coverage to Codecov (optional)

## 📈 Best Practices

### ✅ Do

- Write tests for all new features
- Test happy paths AND error cases
- Use descriptive test names
- Clean up test data between tests
- Mock external API calls
- Test edge cases and boundaries

### ❌ Don't

- Share state between tests
- Use production database for testing
- Skip cleanup in afterEach hooks
- Test implementation details
- Write tests that depend on execution order
- Commit code without running tests

## 🎯 Coverage Goals

Target coverage by component:

| Component | Current | Target |
|-----------|---------|--------|
| Routes    | ~95%    | 90%+   |
| Services  | TBD     | 80%+   |
| Lib       | ~90%    | 85%+   |
| Adapters  | TBD     | 75%+   |
| Overall   | ~85%    | 80%+   |

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing with Prisma](https://www.prisma.io/docs/guides/testing/unit-testing)
- [Hono Testing Guide](https://hono.dev/getting-started/testing)

## 🔜 Coming Soon

- [ ] E2E tests for complete workflows
- [ ] Performance benchmarks
- [ ] Visual regression tests (Storybook)
- [ ] Contract testing for APIs
- [ ] Load testing with k6

---

**Happy Testing!** 🧪

For questions or issues, check the [main documentation](docs/README.md) or open an issue on GitHub.
