#!/bin/bash

echo "Fixing imports in web app to use @roast/ai package..."

# Fix tool imports
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|from '@/tools/check-math'|from '@roast/ai'|g" \
  -e "s|from '@/tools/check-math-hybrid'|from '@roast/ai'|g" \
  -e "s|from '@/tools/check-math-with-mathjs'|from '@roast/ai'|g" \
  -e "s|from '@/tools/check-spelling-grammar'|from '@roast/ai'|g" \
  -e "s|from '@/tools/detect-language-convention'|from '@roast/ai'|g" \
  -e "s|from '@/tools/extract-factual-claims'|from '@roast/ai'|g" \
  -e "s|from '@/tools/extract-forecasting-claims'|from '@roast/ai'|g" \
  -e "s|from '@/tools/extract-math-expressions'|from '@roast/ai'|g" \
  -e "s|from '@/tools/fact-checker'|from '@roast/ai'|g" \
  -e "s|from '@/tools/forecaster'|from '@roast/ai'|g" \
  -e "s|from '@/tools/fuzzy-text-locator'|from '@roast/ai'|g" \
  -e "s|from '@/tools/document-chunker'|from '@roast/ai'|g" \
  -e "s|from '@/tools/perplexity-research'|from '@roast/ai'|g" \
  -e "s|from '@/tools/registry'|from '@roast/ai/tools/registry'|g" \
  -e "s|from '@/tools/base/Tool'|from '@roast/ai'|g" \
  -e "s|from '@/tools/base/types'|from '@roast/ai'|g" \
  -e "s|from '@/tools/base/createToolRoute'|from '@roast/ai'|g" \
  -e "s|from '@/tools/base/testRunner'|from '@roast/ai'|g" \
  -e "s|from '@/tools/shared/cache-utils'|from '@roast/ai'|g" \
  -e "s|from '@/tools/shared/math-schemas'|from '@roast/ai'|g" \
  {} \;

# Fix specific fuzzy-text-locator imports
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|from '@/tools/fuzzy-text-locator/core'|from '@roast/ai/tools/fuzzy-text-locator/core'|g" \
  {} \;

# Fix tools/* imports without the full path
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|from '../../tools/check-math'|from '@roast/ai'|g" \
  -e "s|from '../../tools/forecaster'|from '@roast/ai'|g" \
  -e "s|from '../../tools/fact-checker'|from '@roast/ai'|g" \
  -e "s|from '../../tools/extract-forecasting-claims'|from '@roast/ai'|g" \
  -e "s|from '../../tools/extract-factual-claims'|from '@roast/ai'|g" \
  -e "s|from '../../tools/check-spelling-grammar'|from '@roast/ai'|g" \
  {} \;

# Fix analysis-plugins imports
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' \
  -e "s|from '../../analysis-plugins/PluginManager'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/TextChunk'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/types'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/types/plugin-types'|from '@roast/ai/analysis-plugins/types'|g" \
  -e "s|from '../../analysis-plugins/plugins/math'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/utils/textHelpers'|from '@roast/ai/analysis-plugins/utils/textHelpers'|g" \
  {} \;

echo "Import fixes completed!"