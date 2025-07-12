#!/bin/bash
# test-claude-code-now.sh
# Minimal test to verify Claude Code works

echo "🧪 Testing Claude Code with minimal example"
echo "This will make 1 real API call"

# Simple test
claude -p "Read the file test_blog_post.md and write a 150-word summary of its main argument about statistical correlations. Save as test_summary.md" \
  --max-turns 5 \
  --allowedTools Read,Write

echo "✅ Test complete! Check test_summary.md"