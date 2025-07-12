#!/bin/bash

echo "🧹 Cleaning up experiment 18 directory..."
echo

# Create archive directory with timestamp
ARCHIVE_DIR="archive/cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR/outputs"
mkdir -p "$ARCHIVE_DIR/logs"
mkdir -p "$ARCHIVE_DIR/state"

echo "📁 Created archive directory: $ARCHIVE_DIR"

# Archive the most recent successful analyses (keep the latest of each doc)
echo "📦 Archiving recent successful analyses..."

# Keep only the most recent analysis for each document
for doc in doc1 doc2 doc3; do
    latest=$(ls -d outputs/${doc}-* 2>/dev/null | sort -r | head -1)
    if [ -n "$latest" ]; then
        echo "   Keeping latest ${doc} analysis: $(basename $latest)"
        # Archive older ones
        ls -d outputs/${doc}-* 2>/dev/null | sort -r | tail -n +2 | while read dir; do
            mv "$dir" "$ARCHIVE_DIR/outputs/"
            echo "   Archived: $(basename $dir)"
        done
    fi
done

# Archive test runs except the most recent
echo "📦 Archiving test runs..."
latest_test=$(ls -d outputs/test-* 2>/dev/null | sort -r | head -1)
if [ -n "$latest_test" ]; then
    echo "   Keeping latest test: $(basename $latest_test)"
    ls -d outputs/test-* 2>/dev/null | sort -r | tail -n +2 | while read dir; do
        mv "$dir" "$ARCHIVE_DIR/outputs/"
        echo "   Archived: $(basename $dir)"
    done
fi

# Move loose files in outputs to archive
echo "📦 Archiving loose files in outputs/..."
for file in outputs/*.json outputs/*.md; do
    if [ -f "$file" ]; then
        mv "$file" "$ARCHIVE_DIR/outputs/"
        echo "   Archived: $(basename $file)"
    fi
done

# Archive old iteration outputs
if [ -d "outputs/iteration-1-synthesis" ]; then
    mv outputs/iteration-* "$ARCHIVE_DIR/outputs/" 2>/dev/null
    echo "   Archived iteration outputs"
fi

# Archive old run directories
if ls -d outputs/run-* >/dev/null 2>&1; then
    mv outputs/run-* "$ARCHIVE_DIR/outputs/"
    echo "   Archived run directories"
fi

# Archive log files
echo "📦 Archiving log files..."
mv *.log "$ARCHIVE_DIR/logs/" 2>/dev/null && echo "   Archived analysis logs"

# Clear state directory (it's meant to be temporary)
echo "🧹 Clearing state directory..."
if [ -d "state" ]; then
    mv state/* "$ARCHIVE_DIR/state/" 2>/dev/null
    echo "   State files archived"
fi

# Create a summary of what's left
echo
echo "✨ Cleanup complete!"
echo
echo "📊 Remaining in outputs/:"
ls -la outputs/ | grep "^d" | wc -l | xargs echo "   Directories:"
ls -la outputs/ | grep "^-" | wc -l | xargs echo "   Files:"
echo
echo "📁 Current outputs:"
ls -1 outputs/ | sed 's/^/   /'

echo
echo "💾 Archive created at: $ARCHIVE_DIR"
echo "   To permanently delete the archive: rm -rf $ARCHIVE_DIR"