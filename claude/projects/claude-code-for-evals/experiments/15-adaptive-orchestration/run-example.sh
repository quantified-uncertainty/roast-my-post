#!/bin/bash

echo "🎯 ADAPTIVE ORCHESTRATION EXAMPLE"
echo "================================="
echo
echo "This example shows how the system adapts its strategy based on findings."
echo

# Copy input file
cp ../13-parallel-claude-robust/input.md ./input.md 2>/dev/null || {
    echo "❌ Error: Could not find input.md"
    exit 1
}

# Make scripts executable
chmod +x *.sh *.js strategies/*.sh

# Run with limited iterations for demo
echo "Running with max 3 iterations for demonstration..."
echo

./orchestrator.sh --max-iterations 3 --time-budget 600