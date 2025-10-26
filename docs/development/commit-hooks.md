# Git Commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality standards automatically.

## Pre-commit Hook

Every time you run `git commit`, the following checks run automatically:

### 1. TypeScript Type Checking

```bash
npm run type-check
```

- Runs `tsc --noEmit` on the entire codebase
- Fails if there are any TypeScript errors
- **Blocks commit** if errors found

### 2. Lint-Staged

For all staged `*.ts` files:

```bash
eslint --fix      # Auto-fix ESLint issues
prettier --write  # Format code with Prettier
```

- Only runs on files you're committing (not the whole codebase)
- Automatically fixes linting issues when possible
- Automatically formats code with Prettier
- **Blocks commit** if unfixable errors remain

## What This Means For You

### ✅ Good Experience

When you commit clean code:

```bash
git add src/my-file.ts
git commit -m "feat: add new feature"

# ✅ Type check passed
# ✅ ESLint auto-fixed minor issues
# ✅ Prettier formatted your code
# ✅ Commit successful
```

### ❌ Blocked Commit

When there are errors:

```bash
git add src/broken-file.ts
git commit -m "fix: broken code"

# ❌ Type check failed:
#    src/broken-file.ts:10:5 - error TS2322: Type 'string' is not assignable to type 'number'
#
# Commit blocked! Fix the errors and try again.
```

## Bypassing Hooks (NOT Recommended)

In rare cases, you may need to skip hooks:

```bash
git commit --no-verify -m "emergency fix"
```

**⚠️ WARNING**: Only use `--no-verify` for genuine emergencies. All code should pass quality checks before being committed.

## Manual Commands

You can run these checks manually at any time:

```bash
# Type check the entire codebase
npm run type-check

# Lint all files
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all files
npm run format
```

## Configuration Files

- **Husky**: `.husky/pre-commit`
- **lint-staged**: `package.json` (lint-staged section)
- **ESLint**: `eslint.config.js`
- **TypeScript**: `tsconfig.json`
- **Prettier**: `.prettierrc` or `package.json`

## Troubleshooting

### Hook not running

```bash
# Reinstall Husky hooks
npm run prepare
```

### ESLint errors on test files

Test files are excluded from strict checking. If you're seeing errors:

1. Check that your file is in `src/__tests__/`
2. Verify `eslint.config.js` has correct ignore patterns

### Prettier conflicts with ESLint

Our ESLint config is compatible with Prettier. If you see conflicts:

1. Update `.prettierrc` to match ESLint rules
2. Or update `eslint.config.js` to allow Prettier's formatting

## Benefits

- ✅ **No broken builds**: TypeScript errors caught before commit
- ✅ **Consistent code style**: Prettier auto-formats everything
- ✅ **Clean Git history**: All commits pass quality checks
- ✅ **Faster reviews**: No nitpicking on formatting/style
- ✅ **Better collaboration**: Everyone follows the same standards

## CI/CD Integration

These same checks should run in your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Type Check
  run: npm run type-check

- name: Lint
  run: npm run lint

- name: Test
  run: npm test
```

This ensures code quality both locally and in CI.

---

**Last Updated**: 2025-10-26
