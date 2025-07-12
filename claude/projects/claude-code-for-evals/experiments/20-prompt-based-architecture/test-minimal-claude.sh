#!/bin/bash

echo "Testing minimal Claude Code usage..."

# Test 1: Simple direct command
echo -e "\n1. Direct command test:"
echo "What is 2+2?" | claude --print

# Test 2: Test with temp file (as used in analyzer)
echo -e "\n2. Temp file test:"
cat > /tmp/test-prompt.txt << 'EOF'
What is 3+3?
EOF
cat /tmp/test-prompt.txt | claude --print

# Test 3: Test with longer prompt (similar to analyzer)
echo -e "\n3. Longer prompt test:"
cat > /tmp/test-long-prompt.txt << 'EOF'
Find logical errors in this text section.

For each potential logical error:
1. Identify the specific claims or statements involved
2. Explain why they might be contradictory or inconsistent
3. Rate severity: critical (invalidates main argument), major (significant flaw), minor (small inconsistency)

Use this format for each finding:
FINDING: [line] | [severity] | [quote] | [explanation]

Text section (lines 1-5):
The sky is blue. Water is wet. All birds can fly, including penguins.
EOF

timeout 30 cat /tmp/test-long-prompt.txt | claude --print 2>&1 | head -20

# Clean up
rm -f /tmp/test-prompt.txt /tmp/test-long-prompt.txt