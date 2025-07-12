#!/bin/bash

# Quick test - just run one analysis to see if it works at all
echo "Quick smoke test - running logical_errors on doc1.md"
echo "This should take about 30-60 seconds..."
echo ""

./prompt-based-analyzer.js test-documents/doc1.md --prompts logical_errors

echo ""
echo "If you see output files above, the analyzer is working!"
echo "Check the outputs/ directory for the full results."