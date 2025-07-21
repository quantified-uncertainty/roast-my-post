# Documentation Cleanup Plan for /docs Directory

## Executive Summary

The `/docs` directory contains 16 files across deployment and development subdirectories. While generally well-organized, there are critical issues including missing referenced files, date inconsistencies (files dated 2025 instead of 2024), broken links, and duplicate content. This plan outlines a systematic approach to clean up and improve the documentation.

## Critical Issues Requiring Immediate Attention

### 1. Date Inconsistencies
Multiple files contain dates in 2025, which appear to be typos for 2024:
- `dead-code-cleanup-2025-06-30.md` → should be `dead-code-cleanup-2024-06-30.md`
- Migration dates: `20250125` → should be `20240125`
- Creation dates showing "2025-01-25" → should be "2024-01-25"

### 2. Missing Files (Referenced but Non-existent)
The following files are referenced in README.md but don't exist:
- `/docs/development/claude-wrapper-migration-guide.md`
- `/docs/development/database.md` (marked "coming soon")
- `/docs/development/architecture.md` (marked "coming soon")
- `/docs/operations/deployment.md` (marked "coming soon")
- `/docs/operations/monitoring.md` (marked "coming soon")

### 3. Broken Internal Links
- Agent schema path: `/app/agents/readme/agent-schema-documentation.md` → should be `/src/app/agents/readme/agent-schema-documentation.md`
- Missing cross-references between related documents

## Detailed Cleanup Plan

### Phase 1: Critical Fixes (Day 1)

#### Task 1.1: Fix All Date References
**Files to update:**
- `dead-code-cleanup-2025-06-30.md` → Rename file and update internal dates
- `ephemeral-experiments-migration.md` → Update migration date from 20250125
- `index-migration-summary.md` → Check and update any 2025 references
- All other files with "2025" dates

**Command sequence:**
```bash
# Rename file
mv docs/development/dead-code-cleanup-2025-06-30.md docs/development/dead-code-cleanup-2024-06-30.md

# Find all 2025 references
grep -r "2025" docs/

# Update dates in files (verify each change)
```

#### Task 1.2: Create Missing Critical File
**Create `/docs/development/claude-wrapper-migration-guide.md`:**
```markdown
# Claude Wrapper Migration Guide

## Overview
This guide helps migrate from direct Anthropic client usage to the centralized Claude wrapper pattern.

## Migration Steps

### 1. Update Imports
```typescript
// Old
import Anthropic from '@anthropic-ai/sdk';

// New
import { createCompletion } from '@/lib/claude/wrapper';
```

### 2. Update Function Calls
[Details based on actual wrapper implementation]

### 3. Update Environment Variables
[Configuration changes if any]

## Benefits
- Centralized error handling
- Consistent Helicone tracking
- Unified retry logic
- Cost tracking

## Common Issues
[To be filled based on migration experience]
```

#### Task 1.3: Fix Broken Links
**Update in `/docs/development/agents.md`:**
```markdown
# Change
[Agent Version Schema Documentation](/app/agents/readme/agent-schema-documentation.md)

# To
[Agent Version Schema Documentation](/src/app/agents/readme/agent-schema-documentation.md)
```

### Phase 2: Content Consolidation (Day 1-2)

#### Task 2.1: Merge Markdown Prepend Documentation
**Consolidate into single file:**
1. Keep `markdown-prepend-implementation.md` as main file
2. Move critical issues content from `markdown-prepend-critical-issues.md` into a "Known Issues" section
3. Delete the critical issues file
4. Update any references

**New structure for `markdown-prepend-implementation.md`:**
```markdown
# Markdown Prepend Implementation

## Overview
[Existing content]

## Implementation Details
[Existing content]

## Known Issues and Bugs
[Content from critical-issues.md]

## Testing
[Existing content]

## Future Improvements
[Combined from both files]
```

#### Task 2.2: Create Documentation Templates
**Create `/docs/templates/` directory with:**

1. **feature-documentation.md**
```markdown
# [Feature Name]

## Overview
Brief description of the feature.

## Implementation
### Architecture
[High-level design]

### Key Components
- Component 1: Description
- Component 2: Description

### API/Interface
[Public API documentation]

## Usage Examples
[Code examples]

## Configuration
[Environment variables, settings]

## Testing
[How to test this feature]

## Troubleshooting
[Common issues and solutions]

## Related Documentation
- [Link 1]
- [Link 2]

---
Last Updated: YYYY-MM-DD
```

2. **deployment-checklist.md**
3. **migration-guide.md**

### Phase 3: Structure Improvements (Day 2)

#### Task 3.1: Create Placeholder Files
**For each "coming soon" item, create basic structure:**

1. **`/docs/development/database.md`**
```markdown
# Database Architecture and Operations

## Overview
PostgreSQL database with Prisma ORM.

## Schema Design
[TODO: Document key tables and relationships]

## Common Queries
[TODO: Add query patterns]

## Migrations
See [Prisma documentation](https://www.prisma.io/docs/)

## Backup and Recovery
[TODO: Document backup procedures]

---
Status: Under Construction
Last Updated: 2024-01-21
```

2. **`/docs/development/architecture.md`**
3. **`/docs/operations/deployment.md`**
4. **`/docs/operations/monitoring.md`**

#### Task 3.2: Add Navigation Headers
**Add to each documentation file:**
```markdown
---
nav_order: [number]
parent: [Development|Deployment|Operations|Security]
---

# [Title]

**Related**: [Link 1] | [Link 2] | [Back to Index](/docs/README.md)
```

### Phase 4: Content Enhancement (Day 3)

#### Task 4.1: Add Table of Contents
For files > 500 lines, add TOC after the title:
```markdown
# Title

## Table of Contents
- [Overview](#overview)
- [Section 1](#section-1)
- [Section 2](#section-2)
```

#### Task 4.2: Standardize Formatting
1. **Headings**: Use ATX style (`#` not underlines)
2. **Code blocks**: Always specify language
3. **Lists**: Use `-` for unordered, `1.` for ordered
4. **Links**: Prefer relative links for internal docs

#### Task 4.3: Add Metadata Footer
Add to all files:
```markdown
---

## Document Information
- **Last Updated**: 2024-01-21
- **Status**: [Draft|Review|Final]
- **Maintainer**: [Team/Person]
- **Version**: 1.0.0
```

### Phase 5: Validation and Testing (Day 3-4)

#### Task 5.1: Link Validation
```bash
# Create link checker script
#!/bin/bash
# Check all markdown links in docs/
find docs -name "*.md" -exec grep -l "\[.*\](" {} \; | while read file; do
  echo "Checking $file"
  # Extract and validate links
done
```

#### Task 5.2: Create Documentation Index
Update `/docs/README.md` with complete, accurate index:
```markdown
# Documentation Index

## Quick Links
- [Getting Started](development/quickstart.md)
- [Architecture Overview](development/architecture.md)
- [Deployment Guide](operations/deployment.md)

## Development
### Core Concepts
- ✅ [Agent System](development/agents.md)
- ✅ [Claude Wrapper Pattern](development/claude-wrapper-pattern.md)
- 🚧 [Database Operations](development/database.md)

### Features
- ✅ [Markdown Prepend](development/markdown-prepend-implementation.md)
- ✅ [Multi-Epistemic Evaluation](development/multi-epistemic-eval.md)

### Testing & Quality
- ✅ [Testing Strategy](development/testing.md)
- ✅ [ESLint Rules](development/eslint-rules.md)

## Operations
- 🚧 [Deployment](operations/deployment.md)
- 🚧 [Monitoring](operations/monitoring.md)
- ✅ [Health Checks](operations/health-checks.md)

## Legend
- ✅ Complete
- 🚧 Under Construction
- 📝 Planned
```

## Implementation Schedule

### Day 1: Critical Fixes
- Morning: Fix all date issues (1-2 hours)
- Afternoon: Create claude-wrapper-migration-guide.md (2 hours)
- End of day: Fix broken links (30 minutes)

### Day 2: Consolidation
- Morning: Merge markdown prepend docs (2 hours)
- Afternoon: Create templates and placeholder files (2-3 hours)

### Day 3: Enhancement
- Morning: Add navigation and TOCs (2 hours)
- Afternoon: Standardize formatting (2-3 hours)

### Day 4: Validation
- Morning: Test all links and cross-references (2 hours)
- Afternoon: Update main index and final review (2 hours)

## Success Metrics

### Quantitative
- 0 broken internal links
- 0 missing referenced files
- 100% of files have correct dates
- 100% of files have "Last Updated" metadata

### Qualitative
- Consistent formatting across all files
- Clear navigation between related documents
- No duplicate content
- All "coming soon" items have placeholders

## Long-term Maintenance

### Documentation Standards
1. **New Features**: Must include documentation before merge
2. **Updates**: Documentation updated with code changes
3. **Reviews**: Quarterly documentation review for accuracy
4. **Versioning**: Tag documentation with release versions

### Automation Opportunities
1. **Link Checker**: GitHub Action to validate links
2. **Date Checker**: Script to ensure dates aren't in future
3. **TOC Generator**: Auto-generate table of contents
4. **Stale Content**: Flag documents not updated in 6 months

## Risk Mitigation

### Potential Issues
1. **Breaking existing bookmarks**: Keep redirects for moved files
2. **Lost context**: Preserve git history when renaming
3. **Merge conflicts**: Coordinate with active PRs

### Backup Plan
1. Create documentation backup before major changes
2. Use git branches for each phase
3. Get review before merging large changes

This cleanup will transform the documentation from its current state with missing files and inconsistencies into a well-organized, maintainable resource that serves as the authoritative source for project information.