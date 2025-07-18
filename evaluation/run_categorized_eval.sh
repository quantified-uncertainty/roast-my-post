#!/bin/bash
# Run categorized evaluation

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Run with Python3
python3 scripts/evaluate_categorized.py "$@"