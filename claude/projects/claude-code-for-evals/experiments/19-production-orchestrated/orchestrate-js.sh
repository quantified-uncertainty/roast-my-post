#!/bin/bash

# Simple wrapper to use the JS orchestrator
# This allows backward compatibility with existing scripts

exec node "$(dirname "$0")/orchestrate-analysis.js" "$@"