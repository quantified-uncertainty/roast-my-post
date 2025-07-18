#!/bin/bash
# Run evaluation with categories

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🎯 Running Categorized Evaluation"
echo ""

# Run the categorized evaluation
python3 scripts/add_categories.py "$@"