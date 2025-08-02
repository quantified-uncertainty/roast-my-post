#!/bin/bash

echo "Fixing tool route imports..."

# Fix check-math route
cat > apps/web/src/app/api/tools/check-math/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathTool } from '@roast/ai';

export const POST = createToolRoute(checkMathTool);
EOF

# Fix check-math-hybrid route
cat > apps/web/src/app/api/tools/check-math-hybrid/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathHybridTool } from '@roast/ai';

export const POST = createToolRoute(checkMathHybridTool);
EOF

# Fix check-math-with-mathjs route
cat > apps/web/src/app/api/tools/check-math-with-mathjs/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { checkMathWithMathJsTool } from '@roast/ai';

export const POST = createToolRoute(checkMathWithMathJsTool);
EOF

# Fix check-spelling-grammar route
cat > apps/web/src/app/api/tools/check-spelling-grammar/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import checkSpellingGrammarTool from '@roast/ai/tools/check-spelling-grammar';

export const POST = createToolRoute(checkSpellingGrammarTool);
EOF

# Fix detect-language-convention route
cat > apps/web/src/app/api/tools/detect-language-convention/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import detectLanguageConventionTool from '@roast/ai/tools/detect-language-convention';

export const POST = createToolRoute(detectLanguageConventionTool);
EOF

# Fix extract-factual-claims route
cat > apps/web/src/app/api/tools/extract-factual-claims/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import extractFactualClaimsTool from '@roast/ai/tools/extract-factual-claims';

export const POST = createToolRoute(extractFactualClaimsTool);
EOF

# Fix extract-forecasting-claims route
cat > apps/web/src/app/api/tools/extract-forecasting-claims/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import extractForecastingClaimsTool from '@roast/ai/tools/extract-forecasting-claims';

export const POST = createToolRoute(extractForecastingClaimsTool);
EOF

# Fix extract-math-expressions route
cat > apps/web/src/app/api/tools/extract-math-expressions/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import extractMathExpressionsTool from '@roast/ai/tools/extract-math-expressions';

export const POST = createToolRoute(extractMathExpressionsTool);
EOF

# Fix fact-checker route
cat > apps/web/src/app/api/tools/fact-checker/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { factCheckerTool } from '@roast/ai';

export const POST = createToolRoute(factCheckerTool);
EOF

# Fix forecaster route
cat > apps/web/src/app/api/tools/forecaster/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { forecasterTool } from '@roast/ai';

export const POST = createToolRoute(forecasterTool);
EOF

# Fix forecaster-simple route
cat > apps/web/src/app/api/tools/forecaster-simple/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { forecasterTool } from '@roast/ai';

export const POST = createToolRoute(forecasterTool);
EOF

# Fix fuzzy-text-locator route
cat > apps/web/src/app/api/tools/fuzzy-text-locator/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import { fuzzyTextLocatorTool } from '@roast/ai';

export const POST = createToolRoute(fuzzyTextLocatorTool);
EOF

# Fix perplexity-research route
cat > apps/web/src/app/api/tools/perplexity-research/route.ts << 'EOF'
import { createToolRoute } from '@/lib/tools/createToolRoute';
import perplexityResearchTool from '@roast/ai/tools/perplexity-research';

export const POST = createToolRoute(perplexityResearchTool);
EOF

# Fix document-chunker route (already has custom implementation)
cat > apps/web/src/app/api/tools/document-chunker/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { documentChunkerTool } from '@roast/ai';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Execute the tool with user context
    const result = await documentChunkerTool.execute(data, {
      userId: session.user.id,
      logger,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Document chunker tool error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
EOF

echo "Route fixes completed!"