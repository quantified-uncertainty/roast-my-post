#!/bin/bash
# Export data from Comet Opik to CSV files

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo -e "${BLUE}Activating virtual environment...${NC}"
    source venv/bin/activate
else
    echo -e "${BLUE}No virtual environment found. Make sure dependencies are installed.${NC}"
fi

# Create exports directory
EXPORT_DIR="exports/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"

echo -e "${GREEN}Exporting Opik data to: $EXPORT_DIR${NC}"
echo

# List available data
echo -e "${BLUE}Available data in Opik:${NC}"
python scripts/export_opik_data.py list
echo

# Export experiments
echo -e "${BLUE}Exporting experiments...${NC}"
python scripts/export_opik_data.py experiments --output "$EXPORT_DIR/experiments.csv" --limit 100

# Export traces
echo -e "${BLUE}Exporting traces...${NC}"
python scripts/export_opik_data.py traces --output "$EXPORT_DIR/traces.csv" --limit 2000

echo
echo -e "${GREEN}✅ Export complete!${NC}"
echo -e "${GREEN}📁 Files saved to: $EXPORT_DIR${NC}"
echo
echo "You can now:"
echo "1. Open the CSV files in Excel/Google Sheets"
echo "2. Analyze with pandas: pandas.read_csv('$EXPORT_DIR/traces.csv')"
echo "3. Import into your favorite data analysis tool"