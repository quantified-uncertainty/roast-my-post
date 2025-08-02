#!/bin/bash

echo "Fixing API routes with correct imports..."

# Update all API routes to use the exported tools from @roast/ai
cat > apps/web/src/app/api/tools/check-spelling-grammar/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkSpellingGrammarTool } from '@roast/ai';

export const POST = createToolRoute(checkSpellingGrammarTool);
EOF

cat > apps/web/src/app/api/tools/detect-language-convention/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { detectLanguageConventionTool } from '@roast/ai';

export const POST = createToolRoute(detectLanguageConventionTool);
EOF

cat > apps/web/src/app/api/tools/extract-factual-claims/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractFactualClaimsTool } from '@roast/ai';

export const POST = createToolRoute(extractFactualClaimsTool);
EOF

cat > apps/web/src/app/api/tools/extract-forecasting-claims/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractForecastingClaimsTool } from '@roast/ai';

export const POST = createToolRoute(extractForecastingClaimsTool);
EOF

cat > apps/web/src/app/api/tools/extract-math-expressions/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { extractMathExpressionsTool } from '@roast/ai';

export const POST = createToolRoute(extractMathExpressionsTool);
EOF

cat > apps/web/src/app/api/tools/perplexity-research/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { perplexityResearchTool } from '@roast/ai';

export const POST = createToolRoute(perplexityResearchTool);
EOF

# Fix the tools API route
cat > apps/web/src/app/api/tools/route.ts << 'EOF'
import { NextResponse } from 'next/server';
import { toolRegistry } from '@roast/ai';

export async function GET() {
  const tools = toolRegistry.getMetadata();
  return NextResponse.json(tools);
}
EOF

echo "API route fixes completed!"