# Task 2: GitHub Actions for Testing Pipeline

## Objective

Set up a comprehensive GitHub Actions workflow focused exclusively on testing and code quality validation. No deployment yet - just ensuring code quality and test coverage for the RoastMyPost application.

## Repository Context

**Repository:** `https://github.com/quantified-uncertainty/roast-my-post`

- Next.js application with TypeScript
- Uses Prisma for database operations
- Likely has Jest/testing framework
- May have linting and formatting rules

## Requirements Analysis

### Check Current Testing Setup

```bash
# Examine existing test configuration
cat package.json | jq '.scripts' | grep -E "(test|lint|check|format)"
find . -name "*.test.*" -o -name "*.spec.*" | head -10
find . -name "jest.config.*" -o -name "vitest.config.*"
find . -name ".eslintrc*" -o -name "eslint.config.*"
find . -name "tsconfig.json"

# Check for testing dependencies
cat package.json | jq '.devDependencies' | grep -E "(jest|vitest|eslint|prettier|typescript)"

# Look for existing GitHub Actions
ls -la .github/workflows/ 2>/dev/null || echo "No workflows directory"
```

### Analyze Current Build Process

```bash
# Test the build process locally
npm run build --dry-run
npm run typecheck 2>&1 | head -10 || echo "No typecheck script"
npm run lint --dry-run 2>&1 | head -10 || echo "No lint script"
npm test --dry-run 2>&1 | head -10 || echo "No test script"
```

## Implementation Requirements

### 1. Core Testing Workflow

**File:** `.github/workflows/test.yml`

**Triggered by:**

- All pull requests
- Pushes to main branch
- Manual workflow dispatch

**Jobs to include:**

1. **Dependencies**: Install and cache dependencies
2. **TypeScript**: Type checking
3. **Linting**: Code style and quality checks
4. **Testing**: Unit and integration tests
5. **Build**: Verify production build works

### 2. Database Testing Setup

**For Prisma tests:**

- Use PostgreSQL service container
- Run database migrations in CI
- Seed test data if needed
- Clean database between test runs

### 3. Node.js Matrix Testing

**Test against multiple Node versions:**

- Node 18 (minimum supported)
- Node 20 (recommended/production)
- Node 21 (latest stable)

## Deliverables

### 1. Main Testing Workflow

**File:** `.github/workflows/test.yml`

Requirements:

- Fast execution with proper caching
- Parallel job execution where possible
- Clear job names and step descriptions
- Proper error reporting
- Cache npm dependencies and build artifacts
- Generate test coverage reports
- Comment PR with test results

### 2. Package.json Scripts Verification

**Update if needed:** `package.json`

Ensure these scripts exist and work:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint src --ext .ts,.tsx,.js,.jsx --fix",
    "typecheck": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{ts,tsx,js,jsx,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,js,jsx,json,md}\"",
    "build": "next build"
  }
}
```

### 3. Testing Configuration Files

**If missing, create:**

- `jest.config.js` or `vitest.config.ts` - Test framework configuration
- `.eslintrc.js` - Linting rules
- `prettier.config.js` - Code formatting rules
- `tsconfig.json` - TypeScript configuration (verify it exists)

### 4. GitHub Actions Dependencies

**Required Actions:**

- `actions/checkout@v4` - Code checkout
- `actions/setup-node@v4` - Node.js setup
- `actions/cache@v3` - Dependency caching
- `codecov/codecov-action@v3` - Coverage reporting (optional)

## Technical Specifications

### 1. Caching Strategy

```yaml
# Cache npm dependencies
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

# Cache Next.js build
- name: Cache Next.js build
  uses: actions/cache@v3
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/package-lock.json') }}
```

### 2. Database Service Configuration

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: roast_my_post_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

### 3. Environment Variables for Testing

```yaml
env:
  NODE_ENV: test
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/roast_my_post_test
  NEXTAUTH_SECRET: test-secret-for-ci
  SKIP_ENV_VALIDATION: true
```

## Workflow Structure

### Job Dependencies

```
install → [typecheck, lint, test, build]
         ↓
     report-results
```

### Parallel Execution

- TypeScript checking
- ESLint analysis
- Jest/Vitest tests
- Next.js build verification

All run in parallel after dependency installation.

## Testing Categories to Include

### 1. Type Safety

- TypeScript compilation without errors
- Strict type checking enabled
- No `any` types in new code (warning)

### 2. Code Quality

- ESLint rules enforcement
- Prettier formatting compliance
- Import/export validation
- Dead code detection

### 3. Functionality Tests

- Unit tests for utilities and components
- Integration tests for API routes
- Database model tests
- Mock external API calls

### 4. Build Verification

- Next.js production build succeeds
- No build warnings/errors
- Bundle size analysis (future enhancement)

## Performance Optimizations

### 1. Job Optimization

- Use `npm ci` instead of `npm install`
- Cache dependencies between runs
- Run jobs in parallel where possible
- Skip redundant builds

### 2. Test Optimization

- Run fastest tests first
- Use test sharding for large test suites
- Cache test results when possible
- Fail fast on critical errors

## Success Criteria

- [ ] Workflow runs successfully on PR creation
- [ ] All tests pass with good coverage (>80%)
- [ ] TypeScript compilation succeeds
- [ ] Linting passes with no errors
- [ ] Build completes successfully
- [ ] Workflow completes in <5 minutes
- [ ] Clear failure reporting when issues exist
- [ ] Proper caching reduces subsequent run times
- [ ] No false positives or flaky tests

## Best Practices to Follow

1. **Fast Feedback**: Critical checks run first
2. **Clear Reporting**: Descriptive job and step names
3. **Efficient Caching**: Reduce redundant work
4. **Comprehensive Coverage**: Test all code paths
5. **Maintainable Config**: Well-documented workflow

## Future Enhancements (Not in this task)

- Deployment workflows
- Docker image building
- Security scanning
- Performance testing
- Visual regression testing

## Notes

- This workflow foundation will support future deployment pipelines
- Focus on reliability and speed for developer experience
- Ensure compatibility with local development workflow
- Consider adding status checks required for PR merging
- Document any special setup requirements for contributors

This testing pipeline ensures code quality and reliability before any deployment activities, providing a solid foundation for the development workflow.
