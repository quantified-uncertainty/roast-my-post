#!/bin/bash
# Simple script to run forecast evaluations

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Forecast Evaluation Runner${NC}"
echo

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements if needed
if ! python -c "import opik" 2>/dev/null; then
    echo "Installing requirements..."
    pip install -q -r evaluation/requirements.txt
fi

# Check if dev server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}⚠️  Warning: Dev server not detected on localhost:3000${NC}"
    echo "   Please run 'npm run dev' in another terminal"
    echo
fi

# Run evaluation with arguments
echo -e "${GREEN}Running evaluation...${NC}"
python evaluation/scripts/evaluate.py "$@"