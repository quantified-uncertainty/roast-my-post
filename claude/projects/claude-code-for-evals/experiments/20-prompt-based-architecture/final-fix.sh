#!/bin/bash

echo "Applying final fix: Add Node.js timeout to execAsync calls..."

# Fix all three analyzers to add Node.js timeout
for file in simple-analyzer.js resumable-analyzer.js prompt-based-analyzer.js; do
    if [ -f "$file" ]; then
        echo "Fixing $file..."
        
        # Add timeout to execAsync options
        # Find lines with execAsync that have shell: '/bin/bash' but no timeout
        sed -i '' "/shell: '\/bin\/bash'/s/}/, timeout: (timeout + 10) * 1000 }/" "$file"
        sed -i '' "/shell: '\/bin\/bash'/s/\${this\.timeout}/timeout/g" "$file"
        
        # Also fix any that just have maxBuffer
        sed -i '' "s/{ maxBuffer: 10 \* 1024 \* 1024, shell: '\/bin\/bash' }/{ maxBuffer: 10 * 1024 * 1024, shell: '\/bin\/bash', timeout: (timeout + 10) * 1000 }/" "$file"
        sed -i '' "s/{ maxBuffer: 10 \* 1024 \* 1024 }/{ maxBuffer: 10 * 1024 * 1024, timeout: 310000 }/" "$file"
        
        echo "  Added Node.js timeout to execAsync calls"
    fi
done

echo -e "\nDone! Testing with simple analyzer..."
TIMEOUT=30 ./simple-analyzer.js test-documents/doc1.md 2>&1 | head -30