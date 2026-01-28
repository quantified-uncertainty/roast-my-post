#!/usr/bin/env bash

# Strict ESLint check for PR changed files only
#
# Runs strict type-aware ESLint rules on files changed in the current branch
# compared to main. Catches real bugs without pedantic style rules.
#
# Usage:
#   ./dev/scripts/lint-pr-strict.sh [options] [path-filter]
#
# Options:
#   -b, --base <branch>    Base branch to compare against (default: origin/main)
#   -l, --list             List files that would be checked, don't run lint
#   -h, --help             Show this help message
#
# Examples:
#   ./dev/scripts/lint-pr-strict.sh                          # All changed files
#   ./dev/scripts/lint-pr-strict.sh internal-packages/ai     # Only ai package
#   ./dev/scripts/lint-pr-strict.sh apps/web                 # Only web app
#   ./dev/scripts/lint-pr-strict.sh -l                       # List files only
#   ./dev/scripts/lint-pr-strict.sh -b origin/develop        # Compare to develop

set -euo pipefail
IFS=$'\n\t'

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DEFAULT_BASE_BRANCH="origin/main"
EXCLUDED_PATTERNS=(
    '\.test\.'
    '\.vtest\.'
    '^meta-evals/'
)

# Strict rules that catch real bugs (not style)
STRICT_RULES=(
    # Dead code detection
    "no-unused-private-class-members:warn"
    "@typescript-eslint/no-unnecessary-condition:warn"
    "@typescript-eslint/no-unnecessary-type-assertion:warn"
    "@typescript-eslint/no-redundant-type-constituents:warn"
    "no-unreachable:error"
    "no-unreachable-loop:warn"

    # Promise/async bugs (critical for Node.js)
    "@typescript-eslint/no-floating-promises:warn"
    "@typescript-eslint/no-misused-promises:warn"
    "@typescript-eslint/await-thenable:warn"
    "@typescript-eslint/require-await:warn"

    # Logic errors
    "@typescript-eslint/switch-exhaustiveness-check:warn"
    "array-callback-return:warn"
    "no-constant-binary-expression:warn"
    "no-self-compare:warn"
    "use-isnan:error"
    "valid-typeof:error"

    # Type safety
    "@typescript-eslint/no-for-in-array:warn"
    "@typescript-eslint/no-array-delete:warn"
    "@typescript-eslint/no-base-to-string:warn"
    "@typescript-eslint/restrict-plus-operands:warn"
    "@typescript-eslint/unbound-method:warn"

    # Error handling
    "@typescript-eslint/only-throw-error:warn"
    "@typescript-eslint/prefer-promise-reject-errors:warn"

    # Security
    "@typescript-eslint/no-implied-eval:error"
    "no-new-func:error"
)

# ==============================================================================
# Output helpers
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}$*${NC}"; }
log_success() { echo -e "${GREEN}$*${NC}"; }
log_warning() { echo -e "${YELLOW}$*${NC}"; }
log_error()   { echo -e "${RED}$*${NC}" >&2; }
log_header()  { echo -e "\n${BOLD}${BLUE}=== $* ===${NC}\n"; }

# ==============================================================================
# Core functions
# ==============================================================================

show_help() {
    sed -n '3,18p' "$0" | sed 's/^# //' | sed 's/^#//'
    exit 0
}

get_changed_files() {
    local base_branch="$1"
    local path_filter="${2:-}"

    local files
    files=$(git diff --name-only "$base_branch"...HEAD 2>/dev/null || git diff --name-only "$base_branch" HEAD)

    # Filter to TypeScript files
    files=$(echo "$files" | grep -E '\.tsx?$' || true)

    # Apply exclusion patterns
    for pattern in "${EXCLUDED_PATTERNS[@]}"; do
        files=$(echo "$files" | grep -v "$pattern" || true)
    done

    # Apply path filter if provided
    if [[ -n "$path_filter" ]]; then
        files=$(echo "$files" | grep "^$path_filter" || true)
    fi

    echo "$files"
}

run_eslint() {
    local files="$1"

    if [[ -z "$files" ]]; then
        log_success "No TypeScript files to check in this scope."
        return 0
    fi

    local file_count
    file_count=$(echo "$files" | wc -l | tr -d ' ')
    log_info "Checking $file_count files..."
    echo ""

    # Build rule arguments array
    local rule_args=()
    for rule in "${STRICT_RULES[@]}"; do
        rule_args+=("--rule=$rule")
    done

    # Convert newline-separated files to array
    local file_array=()
    while IFS= read -r file; do
        [[ -n "$file" ]] && file_array+=("$file")
    done <<< "$files"

    # Run eslint from repo root
    cd "$REPO_ROOT"

    npx eslint \
        --config apps/web/config/eslint/.eslintrc.json \
        "${rule_args[@]}" \
        "${file_array[@]}"
}

list_files() {
    local files="$1"

    if [[ -z "$files" ]]; then
        log_warning "No TypeScript files changed in this scope."
        return 0
    fi

    local file_count
    file_count=$(echo "$files" | wc -l | tr -d ' ')
    log_info "Files that would be checked ($file_count):"
    echo ""
    echo "$files" | sed 's/^/  /'
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    local base_branch="$DEFAULT_BASE_BRANCH"
    local path_filter=""
    local list_only=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -h|--help)
                show_help
                ;;
            -b|--base)
                base_branch="$2"
                shift 2
                ;;
            -l|--list)
                list_only=true
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                show_help
                ;;
            *)
                path_filter="$1"
                shift
                ;;
        esac
    done

    log_header "Strict PR Lint Check"

    log_info "Base branch: $base_branch"
    if [[ -n "$path_filter" ]]; then
        log_info "Path filter: $path_filter"
    else
        log_info "Path filter: (all changed files, excluding meta-evals)"
    fi
    echo ""

    # Get changed files
    local files
    files=$(get_changed_files "$base_branch" "$path_filter")

    if $list_only; then
        list_files "$files"
        exit 0
    fi

    # Run lint
    if run_eslint "$files"; then
        echo ""
        log_success "All strict checks passed!"
    else
        echo ""
        log_error "Strict checks found issues."
        exit 1
    fi
}

main "$@"
