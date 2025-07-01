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

## Next Steps
1. Clone/examine LessWrong repository
2. Create a proof of concept with basic positioning
3. Implement collision detection
4. Consider using a library vs custom implementation

## References
- LessWrong likely uses React (same as our stack)
- Their codebase should be at: https://github.com/ForumMagnum/ForumMagnum or similar
- Google Docs uses a sophisticated positioning system with virtual scrolling

## Current Context
- Our app uses React/Next.js with Slate.js for the editor
- We already have a highlighting system that tracks character offsets
- Comments are currently shown in a separate panel, not inline
- The challenge is moving from panel-based to inline positioning while maintaining good UX