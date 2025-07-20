# Math Plugin Architecture

The Math Plugin follows a clear 5-stage pipeline for processing mathematical expressions in documents.

## Directory Structure

```
math/
├── 01_extract/        # Stage 1: Find math expressions
├── 02_investigate/    # Stage 2: Validate correctness
├── 03_locate/         # Stage 3: Find exact positions
├── 04_analyze/        # Stage 4: Generate insights
├── 05_generate/       # Stage 5: Create UI comments
└── MathPlugin.types.ts # Type definitions
```

## Data Flow

```
Document Text
    ↓
[01] EXTRACT: Find all math expressions
    ↓ PotentialFinding[]
[02] INVESTIGATE: Check if math is correct
    ↓ InvestigatedFinding[]
[03] LOCATE: Find exact positions in document
    ↓ LocatedFinding[]
[04] ANALYZE: Generate patterns & insights
    ↓ Analysis summary
[05] GENERATE: Format as UI comments
    ↓ Comment[]
User Interface
```

## Stage Details

### 01_extract/
- Scans text chunks for mathematical expressions
- Captures surrounding context for location fallback
- Uses LLM to identify math patterns

### 02_investigate/
- Validates mathematical correctness
- Assigns severity levels (low/medium/high)
- Creates descriptive error messages

### 03_locate/
- Finds exact character positions in document
- Uses fuzzy matching for math expressions
- Falls back to surrounding text if needed

### 04_analyze/
- Aggregates findings into patterns
- Calculates error rates and statistics
- Generates human-readable summaries

### 05_generate/
- Converts findings to UI comment format
- Adds highlight information
- Ensures proper formatting for display

## Key Features

1. **Robust Location Finding**: Uses specialized math normalization and fuzzy matching
2. **Fallback Strategies**: Captures surrounding text for location recovery
3. **Type Safety**: Strongly typed at each stage with plugin-specific types
4. **Testable**: Each stage is a pure function that can be tested independently
5. **Clear Flow**: Numbered directories make the pipeline obvious

## Usage

The main `MathPlugin` class orchestrates all stages:

```typescript
// Stage 1: Extract findings from chunks
await plugin.extractPotentialFindings(chunk);

// Stage 2: Validate the findings
await plugin.investigateFindings();

// Stage 3: Locate in document
await plugin.locateFindings(documentText);

// Stage 4: Analyze patterns
await plugin.analyzeFindingPatterns();

// Stage 5: Generate comments for UI
const comments = plugin.getComments(documentText);
```