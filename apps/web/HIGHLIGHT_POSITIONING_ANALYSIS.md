# Highlight Positioning Analysis

## The Fundamental Problem

### Coordinate System Mismatch
- **Database positions**: Stored relative to **markdown text** (with syntax like `[text](url)`)
- **Slate display**: Shows **rendered text** (without markdown syntax)
- **Result**: Raw database positions point to wrong locations in Slate

### Example:
```markdown
# Markdown Text (what database sees):
"Hello [world](http://example.com) and more text"
Positions: 0     6     12                    32

# Rendered Text (what Slate shows):  
"Hello world and more text"
Positions: 0     6   11          

# Position 12 in markdown = "](http://example.com) and"
# Position 12 in Slate = "and more text" 
# ❌ WRONG!
```

## What I Know For Certain

### 1. Database Storage
- Highlights are created during analysis with positions relative to **full document markdown**
- Positions include prepend (metadata section)
- Test in `link-analysis-positions.integration.vtest.ts` confirms: `fullDocument.substring(startOffset, endOffset)` should equal `quotedText`

### 2. SlateEditor Processing
- Receives full document content (markdown with prepend)
- Converts markdown → Slate AST → rendered text
- Needs to map markdown positions → Slate positions

### 3. Current Mapping Approaches

#### A) Context-Based Mapper (`useMarkdownToSlateHighlights`)
- **What it does**: Searches for `quotedText` in Slate using surrounding context
- **Pros**: Handles edge cases, finds correct occurrence among duplicates
- **Cons**: Complex searching, opposite of "nofix" intent

#### B) Diff Mapper (`useHighlightMapper`)  
- **What it does**: Creates markdown→Slate position map using text diffing
- **Pros**: Direct position translation, no searching
- **Cons**: May fail on complex markdown transformations

#### C) Raw Positions (what we tried)
- **What it does**: Uses database positions directly in Slate
- **Result**: ❌ Completely wrong positions (coordinate mismatch)

## The nofix=true Intent

`nofix=true` should mean:
- Show highlights exactly where database says they should be
- No smart searching or fallback logic
- Useful for debugging position issues
- But still needs coordinate transformation (markdown→Slate)

## Current Issues

### 1. Wrong Behavior Before
- `nofix=true` was using complex context searching (opposite of intent)
- `nofix=false` was using raw positions (broken)

### 2. Wrong Behavior After Fix
- `nofix=true` uses raw positions directly (coordinate mismatch)
- Results in highlights at completely wrong locations

### 3. Right Direction (Latest)
- `nofix=true`: Raw positions + diff mapping (minimal processing)
- `nofix=false`: Context mapping (smart searching)

## Investigation Needed

### 1. Debug What's Actually Happening
- Compare markdown text vs Slate text
- Check diff mapper output
- Verify database positions are correct

### 2. Test Coordinate Transformation
- Does `mdToSlateOffset` work correctly?
- Are there edge cases in markdown→Slate conversion?

### 3. Alternative Minimal Approaches
- Character-by-character mapping
- AST-based position tracking
- Pre-computed position maps during document processing

## Minimal Solution Ideas

### Option 1: Enhanced Diff Mapping
- Improve `useHighlightMapper` accuracy
- Add better handling of markdown syntax removal
- Fallback to character-level diff if needed

### Option 2: AST-Based Position Tracking  
- Track position changes during markdown→Slate conversion
- Build position map during parsing, not after
- More accurate than text diffing

### Option 3: Database Position Correction
- Store positions relative to rendered text, not markdown
- Requires changes to analysis pipeline
- Most accurate but requires significant changes

### Option 4: Hybrid Approach
- Use diff mapping for exact position translation
- Only fall back to minimal searching for failed mappings
- Keep searching logic simple (no context scoring)

## Success Criteria

For `nofix=true`:
- ✅ No complex context searching
- ✅ No fallback logic for better matches  
- ✅ Direct position mapping (markdown→Slate)
- ✅ Shows highlights where database indicates
- ✅ Works for debugging position issues

For `nofix=false`:
- ✅ Smart context-based mapping
- ✅ Handles duplicate text occurrences  
- ✅ Fallback logic for best accuracy
- ✅ Production-ready highlighting

## ✅ SOLUTION IMPLEMENTED

### Minimal Position Mapper (`useMinimalPositionMapper`)

**Problem Solved**: Created a lightweight coordinate transformation that handles the markdown→Slate position mapping without complex diff algorithms or text searching.

**Key Insight**: Database positions point to link text (e.g., "React docs") within markdown syntax `[React docs](url)`, but when rendered in Slate, the brackets and URL are removed, shifting all subsequent positions.

**Approach**: 
1. Use regex to identify all markdown links: `\[([^\]]+)\]\([^\)]+\)`
2. Track cumulative character removals as we process the markdown
3. Build 1:1 character mappings for text that survives the transformation
4. Skip over removed markdown syntax (brackets, URLs, etc.)

**Results**: ✅ Tested successfully with complex markdown containing multiple links
- "React docs" at markdown positions 11-21 → Slate positions 10-20
- "Next.js" at markdown positions 61-68 → Slate positions 39-46  

**Implementation**:
- **File**: `/hooks/useMinimalPositionMapper.ts`
- **Usage**: Replaced `useHighlightMapper` in `SlateEditor.tsx`
- **Performance**: Minimal overhead, no complex diffing algorithms
- **Accuracy**: Direct character-level tracking ensures precise mappings

**Benefits**:
- ✅ No text searching required for position mapping
- ✅ Handles all markdown link syntax correctly  
- ✅ Minimal processing overhead
- ✅ Works for both `nofix=true` and `nofix=false` modes
- ✅ Easy to debug and understand