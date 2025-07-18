#!/bin/bash

# Improved evaluation runner with better parallelization

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Skip virtual environment activation - running in system Python

# Default to balanced dataset
DATASET="metaculus-balanced"
THREADS=16
LIMIT=""
SUFFIX=""
CONFIG=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dataset|-d)
            DATASET="$2"
            shift 2
            ;;
        --limit|-l)
            LIMIT="--limit $2"
            shift 2
            ;;
        --suffix|-s)
            SUFFIX="--suffix $2"
            shift 2
            ;;
        --threads|-t)
            THREADS="$2"
            shift 2
            ;;
        --config|-c)
            CONFIG="--config $2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--dataset <name>] [--limit <n>] [--suffix <name>] [--threads <n>] [--config <file>]"
            echo "Datasets: metaculus-easy, metaculus-medium, metaculus-balanced"
            exit 1
            ;;
    esac
done

# Run evaluation
python3 scripts/evaluate_v2.py \
    --dataset "$DATASET" \
    --threads "$THREADS" \
    $LIMIT \
    $SUFFIX \
    $CONFIG