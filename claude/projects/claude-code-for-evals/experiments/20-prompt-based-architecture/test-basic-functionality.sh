#!/bin/bash

# Basic functionality test for prompt-based analyzer
# Tests on the 3 example documents with minimal analysis

echo "================================================"
echo "Testing Prompt-Based Analyzer - Basic Smoke Test"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

# Function to run test and capture results
run_test() {
    local doc=$1
    local test_name=$2
    local prompts=$3
    
    echo -e "${YELLOW}Testing: $test_name${NC}"
    echo "Document: $doc"
    echo "Prompts: $prompts"
    
    # Run the analyzer
    start_time=$(date +%s)
    
    if timeout 300 ./prompt-based-analyzer.js "$doc" --prompts "$prompts" > "$RESULTS_DIR/${test_name}.log" 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        echo -e "${GREEN}✓ Completed in ${duration}s${NC}"
        
        # Find the output directory
        output_dir=$(grep "Output directory:" "$RESULTS_DIR/${test_name}.log" | sed 's/.*Output directory: //')
        
        if [ -n "$output_dir" ] && [ -d "$output_dir" ]; then
            # Copy key outputs
            cp -r "$output_dir" "$RESULTS_DIR/${test_name}-output"
            
            # Check for key files
            if [ -f "$output_dir/report.md" ]; then
                echo "  - Report generated"
            fi
            if [ -f "$output_dir/all-findings.json" ]; then
                findings_count=$(jq length "$output_dir/all-findings.json" 2>/dev/null || echo "unknown")
                echo "  - Findings: $findings_count"
            fi
            if [ -f "$output_dir/dashboard.md" ]; then
                echo "  - Dashboard available"
            fi
        fi
    else
        echo -e "${RED}✗ Failed or timed out${NC}"
        echo "  Check log: $RESULTS_DIR/${test_name}.log"
    fi
    
    echo ""
}

# Test 1: Simple document with basic analysis
run_test "test-documents/doc1.md" "test1-basic" "logical_errors"

# Test 2: Another document with multiple analyses
run_test "test-documents/doc2.md" "test2-multiple" "logical_errors,factual_claims"

# Test 3: Structured paper with statistical analysis
run_test "test-documents/structured-paper.md" "test3-stats" "statistical_analysis"

# Test resume functionality
echo -e "${YELLOW}Testing: Resume Functionality${NC}"
echo "Starting analysis and interrupting after 10 seconds..."

# Start analysis in background
timeout 10 ./prompt-based-analyzer.js "test-documents/doc3.md" --prompts "logical_errors,factual_claims,statistical_analysis" > "$RESULTS_DIR/test4-resume-initial.log" 2>&1 &
PID=$!
sleep 10
kill $PID 2>/dev/null || true

# Find the output directory from the log
output_dir=$(grep "Output directory:" "$RESULTS_DIR/test4-resume-initial.log" | tail -1 | sed 's/.*Output directory: //')

if [ -n "$output_dir" ] && [ -d "$output_dir" ]; then
    echo "Resuming from: $output_dir"
    
    # Try to resume
    if timeout 300 ./prompt-based-analyzer.js "test-documents/doc3.md" "$output_dir" > "$RESULTS_DIR/test4-resume-complete.log" 2>&1; then
        echo -e "${GREEN}✓ Resume successful${NC}"
    else
        echo -e "${RED}✗ Resume failed${NC}"
    fi
else
    echo -e "${RED}✗ Could not find output directory to resume${NC}"
fi

echo ""
echo "================================================"
echo "Test Summary"
echo "================================================"
echo "Results saved in: $RESULTS_DIR"
echo ""
echo "To check outputs:"
echo "  ls -la $RESULTS_DIR/"
echo ""
echo "To view a specific report:"
echo "  cat $RESULTS_DIR/test1-basic-output/report.md"
echo ""
echo "To check for errors:"
echo "  grep -i error $RESULTS_DIR/*.log"
echo ""

# Quick summary of results
echo "Quick check for issues:"
grep -l "error\|Error\|ERROR" "$RESULTS_DIR"/*.log 2>/dev/null | while read -r file; do
    echo -e "${RED}Errors found in: $(basename "$file")${NC}"
done

# Cost estimation check
echo ""
echo "Cost tracking (if available):"
for output in "$RESULTS_DIR"/test*-output/dashboard.md; do
    if [ -f "$output" ]; then
        echo "$(basename $(dirname "$output")):"
        grep -i "cost\|token" "$output" 2>/dev/null | head -3
    fi
done