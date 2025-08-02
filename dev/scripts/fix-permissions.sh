#!/bin/bash

# fix-permissions.sh - Manually fix all script permissions
#
# This script can be run manually to fix permissions if needed.
# However, permissions should be automatically fixed by Git hooks.
#
# Usage: ./dev/scripts/fix-permissions.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Fixing script permissions...${NC}"

# Fix shell scripts
find dev/scripts/ -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true
echo "  ✓ Fixed shell script permissions"

# Fix Python scripts
find dev/scripts/ -name "*.py" -exec chmod +x {} \; 2>/dev/null || true
echo "  ✓ Fixed Python script permissions"

# Fix other common executable files
find . -name "*.js" -path "*/bin/*" -exec chmod +x {} \; 2>/dev/null || true
find . -name "gradlew" -exec chmod +x {} \; 2>/dev/null || true
echo "  ✓ Fixed other executable files"

echo -e "${GREEN}✅ All permissions fixed!${NC}"