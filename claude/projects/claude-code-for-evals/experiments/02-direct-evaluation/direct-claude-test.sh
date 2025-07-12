#!/bin/bash
# Direct test with explicit working document path

cd /Users/ozziegooen/Documents/Github/roast-my-post/claude/projects/claude-code-for-evals

echo "Running direct Claude Code test..."

# Simple evaluation in one shot
claude -p "Read the blog post at test_blog_post.md about statistical correlations. Write a detailed 500+ word evaluation covering: 1) Summary of main argument, 2) Strengths of the post, 3) Weaknesses or areas for improvement, 4) Specific examples from the text. Save your evaluation as direct_evaluation.md" \
  --max-turns 10 \
  --allowedTools Read,Write

echo "Complete! Check direct_evaluation.md"