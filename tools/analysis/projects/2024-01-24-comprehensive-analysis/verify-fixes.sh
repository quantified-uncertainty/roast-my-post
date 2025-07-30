#!/bin/bash

# Verification Script for roast-my-post Health Check Fixes
# Run this after implementing fixes to verify issues are resolved

echo "🔍 Roast My Post Health Check Verification"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to check test result
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}: $2"
        ((FAILED++))
    fi
}

# Function for warnings
warning() {
    echo -e "${YELLOW}⚠️  WARNING${NC}: $1"
    ((WARNINGS++))
}

echo "1. Checking for unprotected API routes..."
echo "-----------------------------------------"
# Check monitor routes for authentication
for route in "monitor/stats" "monitor/evaluations" "monitor/jobs"; do
    if grep -q "authenticateRequest\|authenticateRequestSessionFirst" "src/app/api/$route/route.ts" 2>/dev/null; then
        check_result 0 "$route has authentication"
    else
        check_result 1 "$route is missing authentication"
    fi
done

echo ""
echo "2. Checking for 'any' type usage..."
echo "-----------------------------------"
ANY_COUNT=$(rg ":\s*any" --type ts --type tsx 2>/dev/null | wc -l || echo "0")
if [ "$ANY_COUNT" -lt 50 ]; then
    check_result 0 "Low 'any' usage ($ANY_COUNT occurrences)"
else
    check_result 1 "High 'any' usage ($ANY_COUNT occurrences)"
fi

echo ""
echo "3. Checking for console.log statements..."
echo "-----------------------------------------"
CONSOLE_COUNT=$(rg "console\.(log|error)" --type ts --type tsx 2>/dev/null | grep -v "// OK:" | wc -l || echo "0")
if [ "$CONSOLE_COUNT" -lt 20 ]; then
    check_result 0 "Minimal console usage ($CONSOLE_COUNT occurrences)"
else
    check_result 1 "Excessive console usage ($CONSOLE_COUNT occurrences)"
fi

echo ""
echo "4. Checking for new PrismaClient instances..."
echo "--------------------------------------------"
PRISMA_NEW=$(rg "new PrismaClient" --type ts 2>/dev/null | grep -v "lib/prisma" | wc -l || echo "0")
if [ "$PRISMA_NEW" -eq 0 ]; then
    check_result 0 "No improper PrismaClient instantiation"
else
    check_result 1 "Found $PRISMA_NEW improper PrismaClient instances"
fi

echo ""
echo "5. Checking for missing pagination..."
echo "-------------------------------------"
UNPAGINATED=$(rg "findMany\(" --type ts 2>/dev/null | grep -v "take:" | grep -v "limit" | wc -l || echo "0")
if [ "$UNPAGINATED" -lt 5 ]; then
    check_result 0 "Most queries have pagination ($UNPAGINATED without)"
else
    warning "Found $UNPAGINATED queries without pagination"
fi

echo ""
echo "6. Checking for error message leakage..."
echo "----------------------------------------"
ERROR_LEAKS=$(rg "error\.message.*status.*500" --type ts 2>/dev/null | wc -l || echo "0")
if [ "$ERROR_LEAKS" -eq 0 ]; then
    check_result 0 "No obvious error message leaks"
else
    check_result 1 "Found $ERROR_LEAKS potential error message leaks"
fi

echo ""
echo "7. Checking TypeScript strict mode..."
echo "-------------------------------------"
if grep -q '"strict": true' tsconfig.json 2>/dev/null; then
    check_result 0 "TypeScript strict mode enabled"
else
    warning "TypeScript strict mode not enabled"
fi

echo ""
echo "8. Checking for rate limiting..."
echo "--------------------------------"
RATE_LIMIT=$(rg "rateLimit|rate-limit|Ratelimit" --type ts 2>/dev/null | wc -l || echo "0")
if [ "$RATE_LIMIT" -gt 0 ]; then
    check_result 0 "Rate limiting implementation found"
else
    warning "No rate limiting implementation found"
fi

echo ""
echo "9. Checking for input validation..."
echo "-----------------------------------"
ZOD_USAGE=$(rg "\.safeParse\(|\.parse\(" --type ts 2>/dev/null | wc -l || echo "0")
if [ "$ZOD_USAGE" -gt 20 ]; then
    check_result 0 "Good input validation coverage ($ZOD_USAGE validations)"
else
    warning "Low input validation coverage ($ZOD_USAGE validations)"
fi

echo ""
echo "10. Running security audit..."
echo "-----------------------------"
if npm audit --production 2>/dev/null | grep -q "found 0 vulnerabilities"; then
    check_result 0 "No npm vulnerabilities"
else
    warning "npm vulnerabilities found - run 'npm audit'"
fi

echo ""
echo "=========================================="
echo "VERIFICATION SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Critical issues remain. Please review failed checks.${NC}"
    exit 1
fi