#!/bin/bash

# Update all analyzers to use correct Claude Code syntax

echo "Updating analyzers for current Claude Code CLI syntax..."

# Backup originals
for file in simple-analyzer.js resumable-analyzer.js prompt-based-analyzer.js; do
    if [ -f "$file" ]; then
        cp "$file" "${file}.backup"
        echo "Backed up $file"
    fi
done

# Update the callClaude functions
for file in simple-analyzer.js resumable-analyzer.js prompt-based-analyzer.js; do
    if [ -f "$file" ]; then
        # Replace the claude -p "$(cat ...)" syntax with claude --print
        sed -i '' 's/claude -p "\$(cat \${tempFile\})"/cat ${tempFile} | claude --print/g' "$file"
        echo "Updated $file"
    fi
done

echo "Done! The analyzers should now work with current Claude Code."