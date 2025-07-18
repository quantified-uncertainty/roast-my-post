# Authentication for Evaluation

The forecaster API requires authentication. There are several options:

## Option 1: Create Test User (Recommended)
1. Create a dedicated test user account in the app
2. Get the session token from browser cookies after login
3. Add to evaluation script headers

## Option 2: Temporary Test Endpoint
Create a test-only endpoint that bypasses auth:

```typescript
// src/app/api/tools/forecaster-test/route.ts
import forecasterTool from '@/tools/forecaster';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // WARNING: Only for local testing!
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }
  
  const body = await request.json();
  const result = await forecasterTool.run(body, {
    userId: 'test-user',
    logger
  });
  
  return NextResponse.json({ success: true, result });
}
```

## Option 3: API Key System
Add API key authentication to the tool routes for programmatic access.

## Current Workaround
For now, the evaluation script expects the forecaster API to be accessible. You'll need to either:
1. Be logged in to the app in your browser (cookies will be used)
2. Create the test endpoint mentioned above
3. Modify the authentication check for local development