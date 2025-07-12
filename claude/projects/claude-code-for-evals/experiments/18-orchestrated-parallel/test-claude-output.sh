#!/bin/bash

# Test to see what Claude CLI outputs for usage tracking

echo "Testing Claude CLI output format..."
echo

# Create a simple test prompt
PROMPT="Just say 'Hello' and nothing else."

# Run claude and capture all output
echo "Running: claude -p \"$PROMPT\""
echo "========================="
claude -p "$PROMPT" 2>&1 | tee test-claude-output.txt
echo "========================="

# Check if output contains usage information
echo
echo "Checking for usage patterns in output..."
grep -i "token\|usage" test-claude-output.txt || echo "No token/usage info found in output"

# Try with verbose flag if available
echo
echo "Trying with --verbose flag..."
echo "========================="
claude -p "$PROMPT" --verbose 2>&1 | tee test-claude-verbose.txt || claude -p "$PROMPT" -v 2>&1 | tee test-claude-verbose.txt
echo "========================="

echo
echo "Raw output saved to:"
echo "  - test-claude-output.txt"
echo "  - test-claude-verbose.txt"