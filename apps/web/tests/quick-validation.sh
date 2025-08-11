#!/bin/bash

# Quick Tool Validation Script
# Runs a fast check of all tools to get to 99% confidence

echo "================================================"
echo "QUICK TOOL VALIDATION CHECK"
echo "================================================"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Server not running on port 3000"
  echo "   Please start with: pnpm dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# Function to check a tool
check_tool() {
  local tool=$1
  local name=$2
  
  echo -n "Checking $name... "
  
  # Check if page loads
  if curl -s "http://localhost:3000/tools/$tool" | grep -q "Internal Server Error"; then
    echo "❌ Internal Server Error"
    return 1
  fi
  
  # Check if page has expected content
  if curl -s "http://localhost:3000/tools/$tool" | grep -q "$name"; then
    echo "✅"
    return 0
  else
    echo "⚠️  Page loads but missing expected content"
    return 1
  fi
}

# Check all tools
TOOLS=(
  "check-math:Check Math"
  "check-math-hybrid:Check Math Hybrid"
  "check-math-with-mathjs:Check Math with MathJS"
  "check-spelling-grammar:Check Spelling"
  "fact-checker:Fact Checker"
  "extract-factual-claims:Extract Factual Claims"
  "extract-forecasting-claims:Extract Forecasting Claims"
  "detect-language-convention:Detect Language Convention"
  "document-chunker:Document Chunker"
  "extract-math-expressions:Extract Math Expressions"
  "fuzzy-text-locator:Fuzzy Text Locator"
  "link-validator:Link Validator"
  "perplexity-research:Perplexity Research"
  "forecaster:Forecaster"
)

FAILED=0
PASSED=0

echo "Checking all tools..."
echo "------------------------"

for tool_data in "${TOOLS[@]}"; do
  IFS=':' read -r tool name <<< "$tool_data"
  if check_tool "$tool" "$name"; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
done

echo ""
echo "------------------------"
echo "Results:"
echo "  ✅ Passed: $PASSED"
echo "  ❌ Failed: $FAILED"
echo ""

# Run Playwright tests
echo "Running Playwright tests..."
echo "------------------------"

# Page loading tests
echo -n "Page Loading Tests... "
if pnpm playwright test tools-validation.spec.ts --grep "Tool Page Loading Tests" --reporter=dot 2>/dev/null; then
  echo "✅ All pages load correctly"
else
  echo "❌ Some pages have loading issues"
  ((FAILED++))
fi

# Example button tests
echo -n "Example Button Tests... "
if pnpm playwright test tools-validation.spec.ts --grep "example buttons" --reporter=dot 2>/dev/null; then
  echo "✅ All example buttons work"
else
  echo "❌ Some example buttons have issues"
  ((FAILED++))
fi

echo ""
echo "================================================"

# Calculate confidence
TOTAL=$((PASSED + FAILED))
if [ $TOTAL -gt 0 ]; then
  CONFIDENCE=$((PASSED * 100 / TOTAL))
else
  CONFIDENCE=0
fi

echo "CONFIDENCE LEVEL: ${CONFIDENCE}%"

if [ $CONFIDENCE -ge 99 ]; then
  echo "✅ EXCELLENT: All tools are working perfectly!"
elif [ $CONFIDENCE -ge 90 ]; then
  echo "🟢 GOOD: Most tools are working well"
elif [ $CONFIDENCE -ge 70 ]; then
  echo "🟡 FAIR: Some tools need attention"
else
  echo "🔴 POOR: Many tools have issues"
fi

echo "================================================"

# Provide next steps
if [ $FAILED -gt 0 ]; then
  echo ""
  echo "Next steps to reach 99% confidence:"
  echo "1. Fix any Internal Server Errors"
  echo "2. Run comprehensive tests: pnpm playwright test comprehensive-tool-validation.spec.ts"
  echo "3. Check visual issues manually at different screen sizes"
  echo "4. Test with real examples using AI validation"
fi

exit $FAILED