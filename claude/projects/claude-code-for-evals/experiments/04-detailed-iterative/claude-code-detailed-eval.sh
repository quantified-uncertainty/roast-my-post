#!/bin/bash
# claude-code-detailed-eval.sh
# Runs actual Claude Code for detailed evaluation

WORKING_DOC="detailed_evaluation_working.md"
BLOG_POST="test_blog_post.md"
MAX_ITERATIONS=6

echo "🚀 Starting detailed Claude Code evaluation"
echo "⚠️  This will use real API calls (estimated cost: ~$0.50-1.00)"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Initialize with detailed requirements
echo -e "\n📝 Creating detailed working document..."
claude -p "Create a comprehensive working document for evaluating the blog post 'Why the tails fall apart' at $BLOG_POST.

Structure the document with:
- Metadata section
- Detailed task list (at least 8-10 evaluation tasks)
- Current focus tracking
- Comprehensive working memory sections for findings
- Space for detailed draft outputs

Tasks should include:
1. Extract and analyze ALL key claims (not just list them)
2. Deep fact-checking with sources
3. Mathematical accuracy verification
4. Logical flow analysis with specific examples
5. Writing style critique with line-by-line examples
6. Identify unstated assumptions
7. Evaluate evidence quality
8. Suggest improvements
9. Create detailed highlights with context
10. Write comprehensive final evaluation

Set max iterations to $MAX_ITERATIONS. Make the output goal at least 1000 words." \
--max-turns 8 \
--allowedTools Write

# Run iterations with increasing detail requirements
for i in $(seq 1 $MAX_ITERATIONS); do
  echo -e "\n🔄 === Iteration $i/$MAX_ITERATIONS ==="
  
  # Progressively more detailed prompts
  if [ $i -eq 1 ]; then
    DETAIL_LEVEL="thorough initial analysis"
  elif [ $i -eq 2 ]; then
    DETAIL_LEVEL="deep dive with specific examples"
  elif [ $i -eq 3 ]; then
    DETAIL_LEVEL="exhaustive analysis with citations"
  elif [ $i -eq 4 ]; then
    DETAIL_LEVEL="critical examination with counterarguments"
  elif [ $i -eq 5 ]; then
    DETAIL_LEVEL="comprehensive synthesis of all findings"
  else
    DETAIL_LEVEL="final polish and expansion to 1000+ words"
  fi
  
  claude -p "Iteration $i of $MAX_ITERATIONS evaluating the statistics blog post.

IMPORTANT: Produce DETAILED, COMPREHENSIVE output. Each section should be thorough.

1. Read $WORKING_DOC
2. Read the blog post at $BLOG_POST 
3. Check current task focus
4. Complete that task with $DETAIL_LEVEL
5. Write AT LEAST 200-300 words of findings for this task
6. Include specific quotes, examples, and analysis
7. Update working document comprehensively
8. If doing fact-checking, search for real sources
9. If analyzing logic, trace through specific argument chains
10. Mark task complete and set next focus

For the final iteration, ensure the complete evaluation is AT LEAST 1000 words with:
- Executive summary (200+ words)
- Detailed strengths analysis (300+ words)
- Comprehensive weaknesses (300+ words)
- Specific improvement suggestions (200+ words)
- At least 10 annotated highlights

Use all available turns (up to 15) to be thorough." \
--max-turns 15 \
--allowedTools Read,Write,WebSearch

  # Check completion
  if grep -q "Status: COMPLETE" "$WORKING_DOC" 2>/dev/null; then
    echo "✅ Evaluation complete!"
    break
  fi
done

# Extract final evaluation
echo -e "\n📊 Extracting final detailed evaluation..."
claude -p "Read $WORKING_DOC and create a final evaluation document.

Requirements:
1. Must be AT LEAST 1000 words total
2. Professional formatting with clear sections
3. Include all findings from working document
4. Add executive summary if missing
5. Expand on any brief sections
6. Ensure all highlights have detailed commentary

Output as a well-formatted markdown document saved as 'final_detailed_evaluation.md'" \
--max-turns 10 \
--allowedTools Read,Write

echo -e "\n✅ Detailed evaluation complete!"
echo "📄 Working document: $WORKING_DOC"
echo "📄 Final evaluation: final_detailed_evaluation.md"

# Show word count
if [ -f "final_detailed_evaluation.md" ]; then
  WORD_COUNT=$(wc -w < final_detailed_evaluation.md)
  echo "📏 Final evaluation word count: $WORD_COUNT"
fi