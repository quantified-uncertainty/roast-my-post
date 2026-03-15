#!/usr/bin/env bash

# Strict ESLint check for TypeScript files
#
# Runs strict type-aware ESLint rules that catch real bugs.
# Can check PR-changed files or all files in a directory.
#
# Usage:
#   ./dev/scripts/lint-pr-strict.sh [options] [path-filter]
#
# Options:
#   -a, --all              Check ALL files in path (not just PR-changed)
#   -b, --base <branch>    Base branch to compare against (default: origin/main)
#   -l, --list             List files that would be checked, don't run lint
#   -h, --help             Show this help message
#
# Examples:
#   ./dev/scripts/lint-pr-strict.sh                          # PR-changed files
#   ./dev/scripts/lint-pr-strict.sh apps/web                 # PR-changed in web
#   ./dev/scripts/lint-pr-strict.sh -a apps/web/src/app      # ALL files in dir
#   ./dev/scripts/lint-pr-strict.sh -a internal-packages/jobs # ALL files in jobs
#   ./dev/scripts/lint-pr-strict.sh -l                       # List files only

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
    sed -n '3,22p' "$0" | sed 's/^# //' | sed 's/^#//'
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

get_all_files() {
    local path_filter="$1"

    local files
    files=$(find "$REPO_ROOT/$path_filter" -name '*.ts' -o -name '*.tsx' | sed "s|^$REPO_ROOT/||")

    # Apply exclusion patterns
    for pattern in "${EXCLUDED_PATTERNS[@]}"; do
        files=$(echo "$files" | grep -v "$pattern" || true)
    done

    # Exclude node_modules, dist, generated
    files=$(echo "$files" | grep -v 'node_modules/' | grep -v '/dist/' | grep -v '/generated/' | grep -v '/.next/' || true)

    echo "$files"
}

# Detect the right tsconfig for a single file
detect_tsconfig_for_file() {
    local file="$1"

    if [[ "$file" == apps/web/* ]]; then
        echo "apps/web/tsconfig.json"
    elif [[ "$file" == internal-packages/ai/* ]]; then
        echo "internal-packages/ai/tsconfig.json"
    elif [[ "$file" == internal-packages/db/* ]]; then
        echo "internal-packages/db/tsconfig.json"
    elif [[ "$file" == internal-packages/domain/* ]]; then
        echo "internal-packages/domain/tsconfig.json"
    elif [[ "$file" == internal-packages/jobs/* ]]; then
        echo "internal-packages/jobs/tsconfig.json"
    elif [[ "$file" == apps/mcp-server/* ]]; then
        echo "apps/mcp-server/tsconfig.json"
    else
        echo "tsconfig.json"
    fi
}

# Group files by their tsconfig
group_files_by_tsconfig() {
    local files="$1"
    # Output: tsconfig\tfile lines, sorted by tsconfig
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local tsconfig
        tsconfig=$(detect_tsconfig_for_file "$file")
        echo -e "${tsconfig}\t${file}"
    done <<< "$files" | sort -t$'\t' -k1,1
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

    cd "$REPO_ROOT"

    # Group files by tsconfig and run eslint per group
    local grouped
    grouped=$(group_files_by_tsconfig "$files")

    local current_tsconfig=""
    local current_files=()
    local had_errors=false

    while IFS=$'\t' read -r tsconfig file; do
        if [[ "$tsconfig" != "$current_tsconfig" ]]; then
            # Run previous group if any
            if [[ ${#current_files[@]} -gt 0 ]]; then
                log_info "Using tsconfig: $current_tsconfig (${#current_files[@]} files)"
                if ! npx eslint \
                    --config apps/web/config/eslint/.eslintrc.json \
                    --parser-options="project:$current_tsconfig" \
                    "${rule_args[@]}" \
                    "${current_files[@]}"; then
                    had_errors=true
                fi
                echo ""
            fi
            current_tsconfig="$tsconfig"
            current_files=()
        fi
        current_files+=("$file")
    done <<< "$grouped"

    # Run last group
    if [[ ${#current_files[@]} -gt 0 ]]; then
        log_info "Using tsconfig: $current_tsconfig (${#current_files[@]} files)"
        if ! npx eslint \
            --config apps/web/config/eslint/.eslintrc.json \
            --parser-options="project:$current_tsconfig" \
            "${rule_args[@]}" \
            "${current_files[@]}"; then
            had_errors=true
        fi
    fi

    if $had_errors; then
        return 1
    fi
    return 0
}

list_files() {
    local files="$1"

    if [[ -z "$files" ]]; then
        log_warning "No TypeScript files in this scope."
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
    local check_all=false

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
            -a|--all)
                check_all=true
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

    if $check_all; then
        log_header "Strict Lint Check (all files)"
        if [[ -z "$path_filter" ]]; then
            log_error "Path is required with --all flag"
            exit 1
        fi
        log_info "Scope: $path_filter"
    else
        log_header "Strict PR Lint Check"
        log_info "Base branch: $base_branch"
        if [[ -n "$path_filter" ]]; then
            log_info "Path filter: $path_filter"
        else
            log_info "Path filter: (all changed files, excluding meta-evals)"
        fi
    fi
    echo ""

    # Get files
    local files
    if $check_all; then
        files=$(get_all_files "$path_filter")
    else
        files=$(get_changed_files "$base_branch" "$path_filter")
    fi

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
