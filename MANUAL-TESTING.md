# Manual Integration Testing Guide

This guide explains how to run integration and LLM tests manually, both locally and via GitHub Actions.

## 🚀 Quick Start

### GitHub Actions (Manual Trigger)

1. **Go to the Actions tab** in your GitHub repository
2. **Select "Manual Integration Tests"** from the workflow list
3. **Click "Run workflow"** and configure:
   - **Test Suite**: Choose `integration`, `llm`, or `all`
   - **Test Pattern**: Optional - filter tests by name (e.g., "math", "spelling")
   - **Max Cost**: Set cost limit in dollars (default: $2.00)
   - **Slack Notification**: Get notified when tests complete

### Local Testing

```bash
# Quick integration tests (free, ~10 minutes)
pnpm run test:manual --suite=integration

# LLM tests (costs money, ~30 minutes)  
pnpm run test:manual --suite=llm

# All tests
pnpm run test:manual --suite=all

# Specific test pattern
pnpm run test:manual --suite=llm --pattern="math"

# Dry run (see what would execute)
pnpm run test:manual --suite=llm --dry-run
```

## ⚙️ Configuration

### Environment Variables

**Required for LLM tests:**
```bash
export ANTHROPIC_API_KEY="your-key-here"
```

**Optional:**
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/roast_my_post?schema=public"
```

### GitHub Secrets

For GitHub Actions, ensure these secrets are configured:

- `ANTHROPIC_API_KEY` - Required for LLM tests
- `DATABASE_URL` - Test database connection
- `SLACK_WEBHOOK_URL` - Optional, for notifications

## 🧪 Test Suites Explained

### Integration Tests (`--suite=integration`)
- **Cost**: Free
- **Duration**: ~10 minutes
- **What it tests**: Database operations, API routes, business logic
- **Example**: `pnpm run test:manual --suite=integration`

### LLM Tests (`--suite=llm`)
- **Cost**: ~$1.50 for full suite
- **Duration**: ~30 minutes  
- **What it tests**: AI analysis plugins, Claude API integration, document processing
- **Example**: `pnpm run test:manual --suite=llm --pattern="math"`

### All Tests (`--suite=all`)
- **Cost**: ~$1.50 (same as LLM, integration tests are free)
- **Duration**: ~40 minutes
- **What it tests**: Everything - integration + LLM tests
- **Example**: `pnpm run test:manual --suite=all --max-cost=2.00`

## 🎯 Using Test Patterns

Test patterns help you run specific subsets of tests:

```bash
# Run only math-related tests
pnpm run test:manual --suite=llm --pattern="math"

# Run spelling and grammar tests
pnpm run test:manual --suite=llm --pattern="(spelling|grammar)"

# Run comprehensive analysis tests
pnpm run test:manual --suite=llm --pattern="comprehensive"

# Run all fact-checking tests
pnpm run test:manual --suite=integration --pattern="fact.*check"
```

## 💰 Cost Management

### Estimated Costs
- **Integration tests**: $0.00
- **Individual LLM test**: ~$0.05-$0.20
- **Full LLM suite**: ~$1.50
- **Pattern-filtered LLM tests**: ~$0.50

### Cost Controls
```bash
# Set maximum cost limit
pnpm run test:manual --suite=llm --max-cost=1.00

# Run cheapest LLM tests first
pnpm run test:manual --suite=llm --pattern="(math|spelling)"
```

## 📊 Understanding Results

### GitHub Actions Results

Results appear in three places:

1. **Job Summary**: Overview with duration, cost, and status
2. **Step Logs**: Detailed test output and error messages  
3. **Artifacts**: Test coverage reports and logs (kept for 7 days)

### Local Results

```bash
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Tests completed successfully!

Duration: 245 seconds (4 minutes)
Exit Code: 0
Suite: llm
Pattern: math

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔧 Troubleshooting

### Common Issues

**"ANTHROPIC_API_KEY not set"**
```bash
# Solution: Set your API key
export ANTHROPIC_API_KEY="your-key-here"
```

**"Database connection failed"**
```bash
# Solution: Start local database or set DATABASE_URL
docker-compose up -d db
# OR
export DATABASE_URL="your-test-db-url"
```

**"Tests timing out"**
```bash
# Solution: Run with pattern to reduce scope
pnpm run test:manual --suite=llm --pattern="math" --max-cost=0.50
```

**"Cost limit exceeded"**
```bash
# Solution: Increase limit or use patterns
pnpm run test:manual --suite=llm --max-cost=3.00
# OR run specific tests
pnpm run test:manual --suite=llm --pattern="math"
```

### Debug Mode

```bash
# Enable verbose output
pnpm run test:manual --suite=integration --verbose

# Check what would run without executing
pnpm run test:manual --suite=llm --dry-run
```

### Manual Workflow Examples

```bash
# 1. Quick smoke test before pushing code
pnpm run test:manual --suite=integration --pattern="smoke"

# 2. Test specific feature you're working on
pnpm run test:manual --suite=llm --pattern="math" --max-cost=0.25

# 3. Full validation before major release
pnpm run test:manual --suite=all --max-cost=5.00

# 4. Debug failing test
pnpm run test:manual --suite=integration --pattern="failing-test-name" --verbose
```

## 🚦 When to Use Each Method

### Use GitHub Actions When:
- ✅ Testing before merging PR
- ✅ Want to share results with team
- ✅ Need to test on clean environment
- ✅ Working with expensive LLM tests (shared cost)

### Use Local Testing When:
- ✅ Rapid development iteration
- ✅ Debugging specific failures
- ✅ Testing code changes quickly
- ✅ Limited/no internet connection

## 📈 Next Steps

This manual approach sets the foundation for:

1. **Automated triggers** based on code changes
2. **Cost budgeting** and smart test selection
3. **Test quarantine** for flaky tests
4. **Progressive test execution** (fast → comprehensive)

Once you're comfortable with manual testing, we can implement the advanced strategies from the comprehensive refactoring plan.