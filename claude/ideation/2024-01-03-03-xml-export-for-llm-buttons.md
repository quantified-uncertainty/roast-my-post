# XML Export for LLM Buttons - Feature Ideation

## Overview
Add distinctive "Export for LLM" buttons throughout the application to make it easy for users to export data in XML format for use with language models.

## Current State
- **ExportEvaluationButton** component exists at `/src/components/ExportEvaluationButton.tsx`
- Currently uses `ClipboardDocumentIcon` from Heroicons
- Implemented in `VersionDetails` component (evaluation detail pages)
- Exports comprehensive XML with proper escaping and CDATA sections
- Copies to clipboard with visual feedback

## Icon Design Options

### Current Icon
- `ClipboardDocumentIcon` - Functional but not distinctive for AI/LLM use

### Recommended Icon Options
1. **CodeBracketIcon** + export arrow - Best option, suggests structured data for code/LLMs
2. **SparklesIcon** - Commonly indicates AI features, instantly recognizable
3. **CpuChipIcon** - Suggests processing/AI, more technical feel
4. **CommandLineIcon** - Developer-focused, suggests technical export
5. **Custom Composite** - Robot/AI icon with export arrow (requires custom SVG)

### Visual Distinction Strategy
- Use unique color scheme: `bg-indigo-600 hover:bg-indigo-700` (purple/indigo for AI features)
- Add subtle animation on hover (scale or glow effect)
- Include tooltip: "Export as XML for use with LLMs"

## Placement Locations

### Already Implemented
1. **VersionDetails** (`/src/app/docs/[docId]/evaluations/components/VersionDetails.tsx`)
   - In evaluation detail pages
   - Full button with icon and text

### High-Priority Additions

1. **DocumentWithEvaluations** (`/src/components/DocumentWithEvaluations.tsx`)
   - Location: Evaluation view header, next to "Re-run" button
   - Style: Full button matching existing button style
   - Data: Export current evaluation being viewed

2. **DocumentsClient** (`/src/app/docs/DocumentsClient.tsx`)
   - Location: Within evaluation badges on document cards
   - Style: Mini icon-only button (h-3 w-3)
   - Behavior: Quick export without navigating away

3. **EvaluationsList** (in document detail views)
   - Location: Each evaluation row
   - Style: Icon button in actions column
   - Benefit: Export any evaluation from history

### Future Expansion Opportunities

1. **Bulk Export Features**
   - Documents page: "Export All Documents as XML"
   - Agent detail: "Export All Evaluations" for specific agent
   - User dashboard: Export entire corpus

2. **Additional Export Locations**
   - Agent configuration (export agent TOML as XML)
   - Document content only (without evaluations)
   - Comments/highlights standalone export

## Button Variants

### Full Button (Primary)
```tsx
<button className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">
  <CodeBracketIcon className="h-4 w-4" />
  Export for LLM
</button>
```

### Compact Button
```tsx
<button className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700">
  <CodeBracketIcon className="h-3 w-3" />
  XML
</button>
```

### Icon-Only Button
```tsx
<button 
  className="p-1 rounded hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700"
  title="Export as XML for use with LLMs"
>
  <CodeBracketIcon className="h-4 w-4" />
</button>
```

## Implementation Strategy

### Phase 1: Update Existing Component
1. Change icon from `ClipboardDocumentIcon` to `CodeBracketIcon`
2. Update color scheme to indigo
3. Add tooltip for clarity
4. Create size variants (full, compact, icon-only)

### Phase 2: Strategic Placement
1. Add to `DocumentWithEvaluations` evaluation header
2. Add mini buttons to `DocumentsClient` evaluation badges
3. Test user interaction patterns

### Phase 3: Bulk Export Features
1. Implement batch export functionality
2. Add to list views with checkbox selection
3. Consider ZIP download for multiple files

## Technical Considerations

### Component Props Extension
```tsx
interface ExportEvaluationButtonProps {
  evaluationData: {...};
  variant?: 'full' | 'compact' | 'icon';
  className?: string;
  color?: 'gray' | 'indigo'; // Allow theme customization
}
```

### Accessibility
- Ensure all icon-only buttons have proper `aria-label`
- Maintain keyboard navigation support
- Provide clear success/error feedback

### Performance
- Lazy load export functionality for list views
- Consider virtual scrolling for bulk export selections
- Implement progress indicator for large exports

## Success Metrics
- Increased usage of export functionality
- User feedback on discoverability
- Time to export (should remain under 1 second)
- Successful LLM integration stories from users

## Open Questions
1. Should we support other formats (JSON, YAML) in addition to XML?
2. Should exported data include user-specific information or be anonymized?
3. Do we need a dedicated "Export History" feature to track what was exported?
4. Should we implement direct "Send to Claude/ChatGPT" functionality?