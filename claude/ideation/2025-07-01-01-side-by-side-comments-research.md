# Side-by-Side Comments Feature Research

## Overview
The user wants to implement a Google Docs-style comment system where comments appear next to their associated text sections, similar to how LessWrong displays inline comments. This requires careful positioning and collision detection to prevent overlapping comments.

## Current Status
- Initial research phase - need to examine LessWrong's open-source implementation
- User has provided screenshots showing the desired behavior

## Key Technical Challenges
1. **Comment Positioning**: Comments need to align with their associated text/highlights
2. **Collision Detection**: When comments expand or there are multiple comments near each other, they need to reflow to avoid overlap
3. **Responsive Design**: Comments need to work on different screen sizes
4. **Performance**: With many comments, positioning calculations need to be efficient

## Research TODO
1. Find LessWrong's GitHub repository (likely "Lesswrong2" or "ForumMagnum")
2. Locate their comment positioning system components
3. Identify key algorithms/libraries they use for:
   - Positioning comments next to text
   - Collision detection and avoidance
   - Smooth animations when comments reflow
4. Look for any third-party libraries they might use

## Potential Implementation Approaches
1. **Absolute Positioning**: Calculate positions based on highlighted text coordinates
2. **Margin Notes Pattern**: Use CSS grid or flexbox with a dedicated comment column
3. **Virtual Scrolling**: For performance with many comments
4. **Collision Detection Libraries**: Consider libraries like:
   - react-collision-detector
   - Position tracking with Intersection Observer API

## LessWrong Specifics to Investigate
- Component structure for their inline comment system
- How they handle the relationship between highlights and comments
- Their approach to responsive design
- Performance optimizations for many comments

## Research Findings

### LessWrong Implementation (ForumMagnum)
**Repository**: https://github.com/ForumMagnum/ForumMagnum

LessWrong implemented "blockquote side-comments" in PR #6023 with these key features:
- **Positioning**: Comment icons appear in the right margin near paragraphs with matching blockquotes
- **Interaction**: Hovering shows the full comment and replies
- **Text Matching**: Uses fuzzy/partial matching to align comments with text
- **Key Component**: `SideCommentIcon.tsx` handles margin comment display
- **Features**: Pinning, collapsing, karma filtering (10+ karma default)
- **Custom Solution**: No external libraries for positioning - all custom React

### Other React Solutions

#### 1. **Custom CSS Positioning Approach**
From tuzz.tech's commentary sidebar implementation:
- Uses `<aside>` elements with absolute positioning
- Main content at 50% width, comments in right padding
- Comments positioned with `right: 1rem` in padded region
- Responsive: inline on mobile, sidebar on desktop

#### 2. **Available Libraries**
- **react-mentions**: For @mention functionality in comments
- **react-comments-section**: Traditional threaded comments (not side-positioned)
- No ready-made React library specifically for margin notes with collision detection

### Slate.js Solutions

#### 1. **Plate.js Comments Plugin**
- Built on Slate.js, provides complete comment system
- Comments stored as marks on text
- Supports overlapping comments
- Works with discussion plugin for UI layer
- Source: https://platejs.org/docs/comments

#### 2. **Custom Slate.js Implementation (Smashing Magazine)**
Key techniques from their tutorial:
- **Marks for Comments**: Use `commentThread_threadID` marks
- **CommentedText Component**: Custom render for highlighted text
- **State Management**: Recoil atoms for comment data
- **Overlap Handling**: 
  - "Shortest Comment Range Rule" for selection
  - "Insertion Rule" to prevent over-commenting
- **Challenge Solutions**: Handles styled text and complex node structures

#### 3. **Slate Mention Editor**
- Component for @mentions in Slate.js
- More flexible than draft.js alternatives

## Implementation Recommendations

### For Our Use Case

Given our stack (React/Next.js + Slate.js) and requirements:

1. **Best Approach**: Hybrid of Plate.js patterns + custom positioning
   - Use Slate marks for comment associations (like Plate.js)
   - Custom positioning logic for margin display
   - Implement collision detection for overlapping comments

2. **Key Components Needed**:
   - `CommentMark`: Slate mark for comment associations
   - `SideComment`: Positioned comment display component
   - `CommentPositioner`: Logic for calculating positions and avoiding collisions
   - `CommentThread`: Discussion thread UI

3. **Positioning Strategy**:
   - Calculate text node positions using `getBoundingClientRect()`
   - Position comments absolutely in right margin
   - Implement collision detection algorithm to stack/reflow comments
   - Use ResizeObserver/IntersectionObserver for dynamic updates

4. **Libraries to Consider**:
   - **Popper.js/Floating UI**: For robust positioning calculations
   - **react-use-measure**: For tracking element dimensions
   - **Recoil/Zustand**: For comment state management

## Next Steps
1. Build proof of concept with basic Slate marks + absolute positioning
2. Implement collision detection algorithm
3. Add smooth animations for comment reflow
4. Test performance with many comments
5. Consider virtual scrolling for large documents

## Key Learnings
- LessWrong uses custom React solution, no special libraries
- Slate.js marks are ideal for associating comments with text
- Collision detection is the main technical challenge
- Most solutions use absolute positioning in margins
- No off-the-shelf solution exists - requires custom implementation