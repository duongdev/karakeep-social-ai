# Testing Guide

> **Last Updated**: 2025-10-26

Comprehensive guide for testing in Karakeep Social AI, including unit tests, integration tests, and coverage strategies.

## Table of Contents

- [Overview](#overview)
- [Testing Stack](#testing-stack)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Code Coverage](#code-coverage)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)

## Overview

Karakeep uses a comprehensive testing strategy to ensure code quality and reliability:

- **Unit Tests**: Test individual components and functions in isolation
- **Integration Tests**: Test component interactions and API endpoints
- **Coverage Tracking**: Monitor test coverage to maintain code quality
- **CI/CD**: Automated testing on every commit and PR

## Testing Stack

### Core Tools

- **Jest**: Test runner and assertion library
- **ts-jest**: TypeScript support for Jest
- **Prisma Client**: In-memory database for testing
- **Supertest**: HTTP assertions (for API testing)

### Configuration

Test configuration is defined in `jest.config.js`:

```javascript
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 55,
      lines: 35,
      statements: 40,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
  verbose: true,
}
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should authenticate"
```

### Environment Setup

Tests require a test database. Set up your `.env.test`:

```env
# Database
DATABASE_URL="postgresql://karakeep:karakeep_test_password@localhost:5432/karakeep_test?schema=public"

# Redis
REDIS_URL="redis://localhost:6379/1"

# Environment
NODE_ENV="test"
```

### Database Setup for Tests

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations on test database
DATABASE_URL="postgresql://karakeep:karakeep_test_password@localhost:5432/karakeep_test?schema=public" \
  npx prisma migrate deploy

# Reset test database (if needed)
DATABASE_URL="postgresql://karakeep:karakeep_test_password@localhost:5432/karakeep_test?schema=public" \
  npx prisma migrate reset
```

## Test Structure

### Directory Layout

```
src/
├── __tests__/
│   ├── setup.ts              # Test setup and teardown
│   ├── helpers/              # Test utilities and mocks
│   │   ├── test-db.ts       # Database helpers
│   │   └── test-server.ts   # Server test utilities
│   ├── unit/                 # Unit tests
│   │   ├── adapters/        # Adapter unit tests
│   │   ├── db.test.ts       # Database tests
│   │   └── env.test.ts      # Environment tests
│   └── integration/          # Integration tests
│       ├── health.test.ts   # Health endpoint tests
│       └── models.test.ts   # Prisma model tests
└── [source files].ts
```

### Test Categories

#### 1. Unit Tests (`src/__tests__/unit/`)

Test individual components in isolation:

```typescript
// src/__tests__/unit/adapters/base.test.ts
import { BaseAdapter } from '@/adapters/base'

describe('BaseAdapter', () => {
  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const adapter = new MockAdapter({ apiKey: 'test' })
      const result = await adapter.authenticate()
      expect(result).toBe(true)
    })
  })
})
```

#### 2. Integration Tests (`src/__tests__/integration/`)

Test component interactions and full workflows:

```typescript
// src/__tests__/integration/health.test.ts
import request from 'supertest'
import { app } from '@/index'

describe('Health Check Endpoints', () => {
  it('should return 200 status', async () => {
    const response = await request(app).get('/health')
    expect(response.status).toBe(200)
  })
})
```

## Code Coverage

### Current Coverage Status

**As of 2025-10-26:**

| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| Statements | 40.09% | 40% | ✅ Passing |
| Branches | 42.47% | 40% | ✅ Passing |
| Lines | 39.3% | 35% | ✅ Passing |
| Functions | 57.84% | 55% | ✅ Passing |

**Total Tests**: 107 passing

### Coverage Strategy

#### Phase 1: Foundation (Current - Q1 2025)
- ✅ **Core Infrastructure**: Database, environment, health checks
- ✅ **Base Adapter Framework**: BaseAdapter, registry, error handling
- ✅ **Platform Adapters**: Twitter/X and Reddit basic functionality
- 🎯 **Target**: Maintain 40% overall coverage

#### Phase 2: Growth (Q2 2025)
- 📋 **API Endpoints**: Full endpoint test coverage
- 📋 **Platform Adapters**: Complete Twitter, Reddit, GitHub adapters
- 📋 **Edge Cases**: Error scenarios, rate limiting, retries
- 🎯 **Target**: Reach 55% overall coverage

#### Phase 3: Maturity (Q3 2025)
- 📋 **AI Integration**: Claude API, semantic search, Q&A
- 📋 **Transcription**: Cobalt integration, Whisper API, queue processing
- 📋 **Complex Workflows**: End-to-end user journeys
- 🎯 **Target**: Reach 70% overall coverage

#### Phase 4: Excellence (Q4 2025)
- 📋 **Performance Tests**: Load testing, stress testing
- 📋 **Security Tests**: Authentication, authorization, input validation
- 📋 **Edge Cases**: All error paths, boundary conditions
- 🎯 **Target**: Maintain 80%+ coverage

### Coverage Thresholds

Coverage thresholds are enforced in CI/CD and will increase gradually:

| Phase | Statements | Branches | Lines | Functions | Timeline |
|-------|-----------|----------|-------|-----------|----------|
| **Phase 1** (Current) | 40% | 40% | 35% | 55% | 2025-10-26 |
| **Phase 2** | 55% | 50% | 50% | 65% | Q2 2025 |
| **Phase 3** | 70% | 60% | 65% | 75% | Q3 2025 |
| **Phase 4** | 80% | 70% | 75% | 85% | Q4 2025 |

### Viewing Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/index.html

# View coverage in terminal
npm run test:coverage -- --verbose
```

Coverage reports show:
- Line-by-line coverage
- Uncovered branches
- Untested functions
- Coverage percentages per file

## Writing Tests

### Unit Test Template

```typescript
import { YourClass } from '@/path/to/class'

describe('YourClass', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const instance = new YourClass({ config: 'value' })
      const input = 'test-input'

      // Act
      const result = instance.methodName(input)

      // Assert
      expect(result).toBe('expected-output')
    })

    it('should handle error case', () => {
      const instance = new YourClass({ config: 'invalid' })

      expect(() => {
        instance.methodName('bad-input')
      }).toThrow('Expected error message')
    })
  })
})
```

### Integration Test Template

```typescript
import request from 'supertest'
import { app } from '@/index'
import { prisma } from '@/lib/db'

describe('API Endpoint', () => {
  beforeAll(async () => {
    // Setup test data
    await prisma.account.create({
      data: { /* test data */ }
    })
  })

  afterAll(async () => {
    // Cleanup
    await prisma.account.deleteMany()
  })

  it('should return expected response', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200)

    expect(response.body).toMatchObject({
      status: 'success',
      data: expect.any(Object)
    })
  })
})
```

### Testing Async Code

```typescript
it('should handle async operations', async () => {
  const result = await adapter.fetchData()
  expect(result).toBeDefined()
})

it('should handle promise rejection', async () => {
  await expect(adapter.invalidOperation())
    .rejects
    .toThrow('Expected error')
})
```

### Mocking

```typescript
// Mock external API
jest.mock('@/lib/external-api', () => ({
  fetchData: jest.fn().mockResolvedValue({ data: 'mocked' })
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    bookmark: {
      findMany: jest.fn().mockResolvedValue([/* mock data */])
    }
  }
}))
```

## Best Practices

### 1. Test Organization

- ✅ Group related tests with `describe` blocks
- ✅ Use clear, descriptive test names
- ✅ Follow Arrange-Act-Assert pattern
- ✅ Keep tests focused and isolated

### 2. Test Coverage

- ✅ Test happy paths first
- ✅ Then add error cases
- ✅ Cover edge cases and boundaries
- ✅ Test both sync and async code

### 3. Test Data

- ✅ Use factories for consistent test data
- ✅ Clean up after tests (in `afterEach` or `afterAll`)
- ✅ Don't depend on test execution order
- ✅ Use unique identifiers to avoid conflicts

### 4. Performance

- ✅ Keep tests fast (< 100ms per test)
- ✅ Use mocks for external dependencies
- ✅ Run slow tests separately
- ✅ Use `beforeAll` for expensive setup

### 5. Maintainability

- ✅ Avoid test duplication
- ✅ Use helper functions for common setup
- ✅ Keep tests readable and simple
- ✅ Update tests when changing code

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on every push and pull request:

```yaml
# .github/workflows/ci.yml
test:
  name: Test
  runs-on: ubuntu-latest

  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: karakeep
        POSTGRES_PASSWORD: karakeep_test_password
        POSTGRES_DB: karakeep_test
      ports:
        - 5432:5432

  steps:
    - name: Run tests
      env:
        DATABASE_URL: postgresql://karakeep:karakeep_test_password@localhost:5432/karakeep_test?schema=public
        NODE_ENV: test
      run: npm run test:coverage
```

### Pre-commit Hooks

Tests run automatically before commits (via Husky):

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged && npm run type-check"
    }
  }
}
```

See [Commit Hooks Documentation](./commit-hooks.md) for details.

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Ensure test database exists
createdb karakeep_test

# Run migrations
DATABASE_URL="postgresql://karakeep:karakeep_test_password@localhost:5432/karakeep_test?schema=public" \
  npx prisma migrate deploy
```

#### Module Resolution Errors

```bash
# Regenerate Prisma Client
npm run db:generate

# Clear Jest cache
npm test -- --clearCache
```

#### Timeout Errors

```javascript
// Increase timeout for slow tests
it('slow test', async () => {
  // test code
}, 30000) // 30 second timeout
```

#### Coverage Not Updating

```bash
# Clear coverage directory
rm -rf coverage

# Run tests with coverage
npm run test:coverage
```

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

### Related Docs
- [Commit Hooks](./commit-hooks.md)
- [Local Development Setup](./local-setup.md)
- [Contributing Guidelines](./contributing.md)
- [CI/CD Configuration](../deployment/vercel.md)

---

**Questions or Issues?**

Open an issue on GitHub or refer to the main [Documentation Index](../README.md).
