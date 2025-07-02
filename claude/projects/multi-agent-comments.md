# Multi-Agent Comment View Project

## Overview
This project implements a multi-agent comment viewing system for the document preview page. Users can now:
1. See agent names on each comment
2. Select multiple agents to view their comments simultaneously
3. Have agent selection pills in a sticky header within the comments sidebar

## Implementation Status

### ✅ Completed Tasks
- [x] Created feature branch: `feature/multi-agent-comment-view`
- [x] Created this project documentation
- [x] Add agent name display to comments (shows below comment text)
- [x] Implement multi-agent selection logic
- [x] Fixed comment display issues
- [x] Multi-agent comment view working

### 🚧 In Progress
- [ ] Move agent pills to sticky section in comments sidebar (optional enhancement)

### 📋 Planned Tasks
- [ ] Test multi-agent comment view functionality
- [ ] Handle edge cases (no agents selected, etc.)

## Technical Design

### Current State
- Single evaluation view with agent pills in main content area
- Comments shown for one agent at a time
- No agent name shown on comments

### Target State
- Multi-agent view with merged comments
- Agent pills in sticky header of comments sidebar
- Agent name displayed on each comment
- All agents selected by default

### Key Changes

#### 1. Component Structure
```
DocumentWithEvaluations
├── EvaluationView
│   ├── Main Content (SlateEditor)
│   └── CommentsColumn
│       ├── Sticky Agent Pills (NEW)
│       └── Positioned Comments
│           └── Agent Name (NEW)
```

#### 2. State Management
- Replace: `selectedReviewIndex: number` 
- With: `selectedAgentIds: Set<string>`
- Default: All agent IDs included

#### 3. Comment Merging
- Filter evaluations by selected agents
- Merge comments from multiple evaluations
- Maintain agent-specific colors
- Sort by position in document

## Implementation Details

### Phase 1: Add Agent Names to Comments
- Modify `PositionedComment` to accept and display agent name
- Update props chain from `DocumentWithEvaluations` down
- Style: Small text below comment content

### Phase 2: Multi-Agent Selection
- Change state structure in `DocumentWithEvaluations`
- Update agent pill click handlers for toggle behavior
- Implement comment filtering/merging logic

### Phase 3: Sticky Pills in Sidebar
- Move pill rendering to `CommentsColumn`
- Add sticky CSS positioning
- Ensure proper scroll behavior

## Testing Considerations
- Multiple agents selected
- Single agent selected
- No agents selected (show empty state)
- Many agents (pill overflow handling)
- Comment positioning with merged sets

## Notes & Decisions
- Keeping existing pill styling for consistency
- No persistence of selection (always defaults to all)
- Agent name placement: after comment text per user preference
- Color coding: Each agent gets a unique color from a predefined palette
- Comments are merged and sorted by position when multiple agents selected

## Implementation Summary

### Final Approach
Instead of creating a completely new MultiAgentEvaluationView, we enhanced the existing EvaluationView to support multi-agent mode. This approach was more stable and required fewer changes.

### What Was Changed
1. **PositionedComment.tsx**: Added agent name display below comment text
2. **CommentsColumn.tsx**: Updated to handle comments with optional agent names  
3. **DocumentWithEvaluations.tsx**:
   - Added `isMultiAgentMode: boolean` to EvaluationState
   - Modified EvaluationView to handle both single and multi-agent modes
   - Pills toggle between agents in multi-agent mode
   - Comments are merged from selected agents when multiple are selected
   - Agent-specific colors are applied to comments

### Key Features
- All agents selected by default when entering the page
- Click pills to toggle individual agents on/off
- Comments from all selected agents shown together
- Each comment shows its agent name below the text
- Different agents get different highlight colors
- Smooth transitions between selections

### Known Issues Fixed
- Initial attempt with separate MultiAgentEvaluationView caused highlight/comment sync issues
- Fixed by keeping the same component structure and just changing the data flow
- Comments now properly display with correct positioning

### Testing Notes
- ✅ Single agent view still works
- ✅ Multi-agent selection working
- ✅ Comments display with agent names
- ✅ Highlights sync with comments
- ✅ Color coding per agent