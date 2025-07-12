#!/bin/bash

# Fix analyzers for modern Claude Code CLI
# The old -p flag is no longer supported, need to use stdin with --print

echo "Fixing analyzers for modern Claude Code CLI..."

# Restore backups first
for file in simple-analyzer.js resumable-analyzer.js prompt-based-analyzer.js; do
    if [ -f "${file}.backup" ]; then
        cp "${file}.backup" "$file"
        echo "Restored $file from backup"
    fi
done

# Now fix them properly for modern Claude Code
# The issue is that modern Claude Code doesn't support -p "prompt", only --print with stdin

for file in simple-analyzer.js resumable-analyzer.js prompt-based-analyzer.js; do
    if [ -f "$file" ]; then
        # Replace the old command with one that pipes the file content to claude
        sed -i '' 's/`timeout \${this\.timeout} claude -p "\$(cat \${tempFile})"`/`cat ${tempFile} | timeout ${this.timeout} claude --print`/g' "$file"
        sed -i '' 's/`timeout \${timeout} claude -p "\$(cat \${tempFile})"`/`cat ${tempFile} | timeout ${timeout} claude --print`/g' "$file"
        sed -i '' 's/`timeout \${\(.*\)} claude -p "\$(cat \${tempFile})"`/`cat ${tempFile} | timeout ${\1} claude --print`/g' "$file"
        echo "Fixed $file for modern Claude Code"
    fi
done

echo "Done! The analyzers should now work with modern Claude Code CLI."