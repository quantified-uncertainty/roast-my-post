#!/bin/bash

# Test the exact command structure used by the analyzer

echo "Testing Claude Code command structure..."

# Create a simple test prompt
cat > /tmp/test-prompt.txt << 'EOF'
Find logical errors in this text:

The sky is blue because water is wet. All birds can fly, including penguins. 
Since penguins are birds and live in Antarctica, all birds must live in cold climates.

Just respond with a simple list of logical errors found.
EOF

echo "1. Testing with cat substitution (as used in analyzer):"
timeout 30 claude -p "$(cat /tmp/test-prompt.txt)" 2>&1 | head -20

echo -e "\n2. Testing with direct file input:"
timeout 30 claude -p /tmp/test-prompt.txt 2>&1 | head -20

echo -e "\n3. Testing with stdin:"
timeout 30 claude -p - < /tmp/test-prompt.txt 2>&1 | head -20

rm -f /tmp/test-prompt.txt