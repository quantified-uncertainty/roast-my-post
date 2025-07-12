#!/bin/bash

echo "Debugging timeout issue..."

# Test 1: Basic timeout command
echo -e "\n1. Testing basic timeout:"
timeout 5 echo "This should work"

# Test 2: Timeout with pipe
echo -e "\n2. Testing timeout with pipe:"
echo "test" | timeout 5 cat

# Test 3: Timeout with claude
echo -e "\n3. Testing timeout with claude:"
echo "What is 2+2? Just the number." > /tmp/test.txt
cat /tmp/test.txt | timeout 10 claude --print

# Test 4: Test the exact command structure from analyzer
echo -e "\n4. Testing analyzer command structure:"
PROMPT="What is 3+3? Just the number."
echo "$PROMPT" > /tmp/claude-prompt-test.txt
timeout 10 bash -c 'cat /tmp/claude-prompt-test.txt | claude --print'

# Test 5: With shell specification
echo -e "\n5. Testing with shell specification:"
TIMEOUT=10
cat /tmp/claude-prompt-test.txt | timeout ${TIMEOUT} claude --print

# Clean up
rm -f /tmp/test.txt /tmp/claude-prompt-test.txt