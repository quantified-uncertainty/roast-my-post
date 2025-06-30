#!/bin/bash

PR_NUMBER=13
REPO="quantified-uncertainty/roast-my-post"
CHECK_INTERVAL=30

echo "Starting PR monitoring for PR #${PR_NUMBER}"
echo "Checking every ${CHECK_INTERVAL} seconds..."
echo "Press Ctrl+C to stop"
echo ""

while true; do
    echo "=== Check at $(date) ==="
    
    # Get PR status
    PR_DATA=$(gh pr view ${PR_NUMBER} --repo ${REPO} --json state,statusCheckRollup,mergeable 2>/dev/null)
    
    if [ $? -ne 0 ]; then
        echo "Error: Failed to fetch PR data"
    else
        # Parse the JSON data
        STATE=$(echo "$PR_DATA" | jq -r '.state')
        MERGEABLE=$(echo "$PR_DATA" | jq -r '.mergeable')
        
        echo "PR State: $STATE"
        echo "Mergeable: $MERGEABLE"
        echo ""
        echo "CI Status:"
        
        # Check each status
        echo "$PR_DATA" | jq -r '.statusCheckRollup[] | 
            if .__typename == "CheckRun" then
                "  - \(.name): \(.status) \(if .conclusion != "" then "(\(.conclusion))" else "" end)"
            elif .__typename == "StatusContext" then
                "  - \(.context): \(.state)"
            else
                "  - Unknown check type"
            end'
        
        # Check for failures
        FAILURES=$(echo "$PR_DATA" | jq -r '.statusCheckRollup[] | select(.conclusion == "FAILURE" or .state == "FAILURE") | .name // .context' | tr '\n' ', ')
        
        if [ ! -z "$FAILURES" ]; then
            echo ""
            echo "❌ FAILURES DETECTED: $FAILURES"
            echo "Check https://github.com/${REPO}/pull/${PR_NUMBER} for details"
        fi
        
        # Check if all checks completed
        IN_PROGRESS=$(echo "$PR_DATA" | jq -r '.statusCheckRollup[] | select(.status == "IN_PROGRESS" or .state == "PENDING") | .name // .context' | wc -l)
        
        if [ "$IN_PROGRESS" -eq 0 ]; then
            echo ""
            echo "✅ All checks completed!"
        fi
    fi
    
    echo ""
    echo "Waiting ${CHECK_INTERVAL} seconds for next check..."
    sleep ${CHECK_INTERVAL}
done