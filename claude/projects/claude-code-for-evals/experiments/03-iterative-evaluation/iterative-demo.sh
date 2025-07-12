#!/bin/bash
# iterative-demo.sh - Actual iterative evaluation demo

WORKING_DOC="iterative_working.md"
BLOG_POST="test_blog_post.md"

echo "🚀 Starting ITERATIVE evaluation demo (3 iterations)"

# Initialize
echo -e "\n📝 Iteration 1: Initialize working document"
claude -p "Create working document for evaluating blog post at $BLOG_POST. Include: metadata, 4 tasks (extract claims, check facts, analyze logic, write summary), current focus section, and findings section. Keep it simple." \
  --max-turns 5 \
  --allowedTools Write

# Iteration 2: Extract claims
echo -e "\n📝 Iteration 2: Extract and analyze claims"
claude -p "Read $WORKING_DOC and $BLOG_POST. Your task: Extract all key claims about statistics and correlations. List them in the findings section. Update current focus. Mark task complete." \
  --max-turns 8 \
  --allowedTools Read,Write

# Iteration 3: Fact check
echo -e "\n📝 Iteration 3: Fact check the claims"  
claude -p "Read $WORKING_DOC and $BLOG_POST. Your task: Check the factual claims (NBA height, IQ correlations, etc). Search for verification if needed. Add findings. Update focus." \
  --max-turns 10 \
  --allowedTools Read,Write,WebSearch

# Iteration 4: Final synthesis
echo -e "\n📝 Iteration 4: Create final evaluation"
claude -p "Read $WORKING_DOC. Synthesize all findings into a 500+ word evaluation. Include what was found in each previous iteration. Save as iterative_final.md" \
  --max-turns 8 \
  --allowedTools Read,Write

echo -e "\n✅ Iterative evaluation complete!"
echo "Working document: $WORKING_DOC"
echo "Final evaluation: iterative_final.md"