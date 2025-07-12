#!/bin/bash
# Simple test of iterative evaluation

WORKING_DOC="evaluation_working.md"
BLOG_POST="test_blog_post.md"

echo "🚀 Starting simple iterative evaluation test"

# Initialize
echo -e "\n📝 Creating initial working document..."
claude -p "Create a working document for evaluating the blog post 'Why the tails fall apart' at $BLOG_POST. Include sections for metadata, tasks, current focus, findings, and final output. List 3-4 key evaluation tasks." --max-turns 5 --allowedTools Write

# Run 3 iterations
for i in {1..3}; do
  echo -e "\n🔄 Iteration $i/3"
  
  claude -p "Iteration $i: Read $WORKING_DOC and $BLOG_POST. Work on the current task. Update the document with findings. Mark task complete and set next focus. If done, mark COMPLETE." --max-turns 8 --allowedTools Read,Write
  
  # Check if complete
  if grep -q "COMPLETE" "$WORKING_DOC" 2>/dev/null; then
    echo "✅ Evaluation complete!"
    break
  fi
done

echo -e "\n📊 Final document saved to $WORKING_DOC"