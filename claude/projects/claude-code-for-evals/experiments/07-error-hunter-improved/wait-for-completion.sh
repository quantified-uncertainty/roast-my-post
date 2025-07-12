#!/bin/bash

echo "⏳ Waiting for Error Hunter v2 to complete..."
echo "   Press Ctrl+C to stop waiting"

while true; do
    if grep -q "Error Hunter complete" background_run.log 2>/dev/null; then
        echo "✅ Complete!"
        tail -10 background_run.log
        break
    fi
    
    # Check if process is still running
    if ! ps aux | grep -q "[n]ode.*run.js"; then
        echo "❌ Process stopped unexpectedly"
        tail -20 background_run.log
        break
    fi
    
    # Show current status
    CURRENT_ITER=$(tail -20 background_run.log | grep -o "Iteration [0-9]/6" | tail -1)
    ERROR_COUNT=$(grep -E "^\s*[0-9]+\." working/working.md 2>/dev/null | wc -l | tr -d ' ')
    
    printf "\r📊 Status: %s | Errors found: %s" "$CURRENT_ITER" "$ERROR_COUNT"
    
    sleep 10
done