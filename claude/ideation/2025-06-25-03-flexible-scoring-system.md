# Flexible Scoring System Analysis

## Current State

Currently, EvaluationVersion has a single `grade` field:
- Type: `Int?` (nullable integer)
- Range: 0-100
- Display: Converts to letter grades (A+, A, B+, etc.)
- Storage: Single integer value in database

The `AgentVersion` model has a `providesGrades` boolean to indicate if an agent provides grades.

## Limitations

1. **Single Metric**: Only supports a single 0-100 grade
2. **Fixed Scale**: Always 0-100, can't represent other ranges
3. **No Units**: Can't express percentages, prices, probabilities explicitly
4. **Single Value**: Can't output multiple scores from one evaluation

## Proposed Flexible Scoring System

### Option 1: JSON Column with Type Metadata

Add a `scores` JSON column to EvaluationVersion:

```prisma
model EvaluationVersion {
  // ... existing fields
  grade    Int?    // Keep for backward compatibility
  scores   Json?   // New flexible scoring field
}
```

Example scores:
```json
{
  "type": "percentage",
  "value": 85,
  "label": "Accuracy"
}

{
  "type": "price",
  "value": 120.50,
  "currency": "USD",
  "label": "Estimated Value"
}

{
  "type": "probability_distribution",
  "values": {
    "low": 0.2,
    "medium": 0.5,
    "high": 0.3
  },
  "label": "Risk Assessment"
}

{
  "type": "multi_score",
  "scores": [
    {"label": "Technical Quality", "value": 90, "type": "percentage"},
    {"label": "Business Impact", "value": 75, "type": "percentage"},
    {"label": "Implementation Cost", "value": 5000, "type": "price", "currency": "USD"}
  ]
}
```

### Option 2: Separate ScoreType System

Create new models:

```prisma
model ScoreType {
  id          String   @id @default(uuid())
  name        String
  type        String   // "percentage", "price", "probability", etc.
  config      Json?    // Type-specific configuration
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id])
}

model EvaluationScore {
  id                  String            @id @default(uuid())
  evaluationVersionId String
  scoreTypeId         String
  value               Json              // Flexible value storage
  evaluationVersion   EvaluationVersion @relation(fields: [evaluationVersionId], references: [id])
  scoreType           ScoreType         @relation(fields: [scoreTypeId], references: [id])
}
```

### Option 3: Typed Union Approach

Add multiple optional fields:

```prisma
model EvaluationVersion {
  // ... existing fields
  grade           Int?     // Legacy 0-100 grade
  scoreType       String?  // "grade", "percentage", "price", "probability", "multi"
  scoreValue      Json?    // Flexible storage based on scoreType
  scoreMetadata   Json?    // Additional metadata (units, labels, etc.)
}
```

## Comparison

### Option 1: JSON Column
**Pros:**
- Simple to implement
- Flexible without schema changes
- Easy to add new score types

**Cons:**
- No type safety at database level
- Harder to query/aggregate
- All validation in application code

### Option 2: Separate Models
**Pros:**
- Most flexible and extensible
- Can define score types per agent
- Better for complex scoring systems

**Cons:**
- More complex implementation
- Additional joins for queries
- More database tables

### Option 3: Typed Union
**Pros:**
- Balance of flexibility and structure
- Single source of truth
- Easier queries than pure JSON

**Cons:**
- Still requires JSON for complex types
- scoreType field needs careful management

## Recommendation

Start with **Option 3 (Typed Union)** because:

1. **Backward Compatible**: Keep existing `grade` field
2. **Progressive Enhancement**: Can migrate gradually
3. **Simple Implementation**: Single table change
4. **Flexible Enough**: Handles all mentioned use cases
5. **Future Migration Path**: Can move to Option 2 later if needed

## Implementation Plan

1. Add new fields to EvaluationVersion:
   ```prisma
   scoreType     String?
   scoreValue    Json?
   scoreMetadata Json?
   ```

2. Create TypeScript types:
   ```typescript
   type ScoreType = 'grade' | 'percentage' | 'price' | 'probability' | 'multi';
   
   interface ScoreValue {
     type: ScoreType;
     value: number | Record<string, number> | Array<Score>;
     metadata?: {
       label?: string;
       currency?: string;
       unit?: string;
       description?: string;
     };
   }
   ```

3. Update agent configuration to specify score type
4. Modify evaluation processing to handle different score types
5. Update UI components to display various score types

## UI Considerations

- Keep GradeBadge for grade scores
- Create new components:
  - PercentageBadge
  - PriceBadge
  - ProbabilityChart
  - MultiScoreCard
- Score type determines display component

## Migration Strategy

1. Add new fields (non-breaking)
2. Update new evaluations to use scoreType/scoreValue
3. Backfill existing grades: `scoreType: 'grade', scoreValue: { value: grade }`
4. Gradually deprecate direct grade field usage