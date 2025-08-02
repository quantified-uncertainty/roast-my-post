#!/bin/bash

echo "Fixing documentAnalysis imports..."

# Fix multiEpistemicEval
sed -i '' \
  -e "s|from '../../analysis-plugins/PluginManager'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/types/plugin-types'|from '@roast/ai/analysis-plugins/types'|g" \
  apps/web/src/lib/documentAnalysis/multiEpistemicEval/index.ts

# Fix spellingGrammar
sed -i '' \
  -e "s|from '../../analysis-plugins/PluginManager'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/types/plugin-types'|from '@roast/ai/analysis-plugins/types'|g" \
  apps/web/src/lib/documentAnalysis/spellingGrammar/index.ts

# Fix shared files
sed -i '' \
  -e "s|from '../../analysis-plugins/utils/textHelpers'|from '@roast/ai/analysis-plugins/utils/textHelpers'|g" \
  apps/web/src/lib/documentAnalysis/shared/enhancedTextLocationFinder.ts \
  apps/web/src/lib/documentAnalysis/shared/simpleTextLocationFinder.ts \
  apps/web/src/lib/documentAnalysis/shared/textLocationFinder.ts

# Fix pluginLocationWrappers
sed -i '' \
  -e "s|from '@/tools/fuzzy-text-locator/core'|from '@roast/ai/tools/fuzzy-text-locator/core'|g" \
  -e "s|from '../../analysis-plugins/utils/textHelpers'|from '@roast/ai/analysis-plugins/utils/textHelpers'|g" \
  apps/web/src/lib/documentAnalysis/shared/pluginLocationWrappers.ts

# Fix textLocationFinder
sed -i '' \
  -e "s|from '@/tools/fuzzy-text-locator/core'|from '@roast/ai/tools/fuzzy-text-locator/core'|g" \
  apps/web/src/lib/documentAnalysis/shared/textLocationFinder.ts

# Fix LocationUtils
sed -i '' \
  -e "s|from '../../analysis-plugins/TextChunk'|from '@roast/ai'|g" \
  -e "s|from '../../analysis-plugins/types'|from '@roast/ai'|g" \
  apps/web/src/lib/documentAnalysis/utils/LocationUtils.ts

# Fix remaining tool page imports
sed -i '' \
  -e "s|from '@/tools/extract-forecasting-claims'|from '@roast/ai'|g" \
  apps/web/src/app/tools/extract-forecasting-claims/page.tsx

echo "DocumentAnalysis import fixes completed!"