#!/bin/bash

echo "Testing different Claude Code syntax options..."

# Create test prompt
cat > /tmp/test-prompt.txt << 'EOF'
Just respond with "SUCCESS" if you can read this prompt.
EOF

echo "1. Test with --print and direct prompt:"
claude --print "Just respond with SUCCESS if you can read this prompt." 2>&1 | head -5

echo -e "\n2. Test with stdin:"
echo "Just respond with SUCCESS if you can read this prompt." | claude --print 2>&1 | head -5

echo -e "\n3. Test reading from file with Read tool:"
claude --print "Read the file /tmp/test-prompt.txt and tell me what it says" --allowedTools Read 2>&1 | head -10

rm -f /tmp/test-prompt.txt