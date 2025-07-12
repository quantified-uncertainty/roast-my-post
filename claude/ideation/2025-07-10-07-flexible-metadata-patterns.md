# Flexible Metadata Patterns for Evaluations

## Core Challenge
We want evaluations to produce different types of structured output (tags, ratings, extracted data) while maintaining:
- Type safety and validation
- Queryability 
- Flexibility for new types
- Clean data model

## Metadata Storage Options

### Option 1: Single JSON Metadata Field
```prisma
model EvaluationVersion {
  // ... existing fields ...
  summary     String    // "Generated 10 tags for technical categorization"
  metadata    Json?     // Flexible structured data
  
  // Metadata examples:
  // Tags: {"type": "tags", "data": {"technical": ["react", "hooks"], "difficulty": "intermediate"}}
  // Ratings: {"type": "ratings", "data": {"clarity": 8, "accuracy": 9, "completeness": 7}}
  // Extraction: {"type": "keyPoints", "data": {"main": "...", "supporting": ["...", "..."]}}
}
```

**Pros:**
- Simple schema change (one field)
- Infinitely flexible
- Easy to add new types

**Cons:**
- No DB-level validation
- Complex queries require JSON operations
- Type safety must be enforced in application

### Option 2: Typed Metadata Table
```prisma
model EvaluationVersion {
  // ... existing fields ...
  summary     String
  metadata    EvaluationMetadata[]
}

model EvaluationMetadata {
  id                    String              @id
  evaluationVersion     EvaluationVersion   @relation(...)
  evaluationVersionId   String
  
  metadataType         String              // "tag", "rating", "extraction"
  
  // One of these is populated based on type
  tagData              Json?               // {"category": "technical", "value": "react"}
  ratingData           Json?               // {"dimension": "clarity", "score": 8}
  extractionData       Json?               // {"type": "keyPoint", "content": "..."}
  
  // Common fields
  confidence           Float?
  metadata             Json?               // Additional type-specific data
  
  @@index([evaluationVersionId, metadataType])
}
```

**Pros:**
- More structured than pure JSON
- Can index and query by type
- Supports multiple metadata items per evaluation

**Cons:**
- More complex schema
- Many nullable fields
- Still relies on JSON for flexibility

### Option 3: Polymorphic Metadata (Recommended)
```prisma
model EvaluationVersion {
  // ... existing fields ...
  summary          String    // Human-readable summary
  
  // Single metadata field with formalized structure
  metadata         Json?     @db.JsonB
  metadataSchema   String?   // Schema identifier for validation
  
  // Extracted fields for common queries
  metadataTags     String[]  @default([])  // Flattened tags for search
  metadataScores   Json?     // Key scores for filtering
}
```

## Formalization Strategies

### 1. Schema Registry Pattern
```typescript
// schemas/metadata-schemas.ts
export const MetadataSchemas = {
  "tags-v1": z.object({
    type: z.literal("tags"),
    version: z.literal(1),
    tags: z.record(z.array(z.string())), // {"category": ["tag1", "tag2"]}
    confidence: z.record(z.number()),    // {"category": 0.85}
    totalTags: z.number()
  }),
  
  "ratings-v1": z.object({
    type: z.literal("ratings"),
    version: z.literal(1),
    dimensions: z.record(z.object({
      score: z.number().min(0).max(100),
      confidence: z.number().min(0).max(1),
      notes: z.string().optional()
    }))
  }),
  
  "extraction-v1": z.object({
    type: z.literal("extraction"),
    version: z.literal(1),
    extractionType: z.enum(["keyPoints", "facts", "quotes", "code"]),
    items: z.array(z.object({
      content: z.string(),
      importance: z.enum(["critical", "high", "medium", "low"]),
      metadata: z.any()
    }))
  })
};

// Validation helper
export function validateMetadata(schemaId: string, data: unknown) {
  const schema = MetadataSchemas[schemaId];
  if (!schema) throw new Error(`Unknown schema: ${schemaId}`);
  return schema.parse(data);
}
```

### 2. Agent Declaration Pattern
```typescript
// Agents declare what metadata they produce
interface AgentMetadataSpec {
  schemaId: string;
  description: string;
  examples: any[];
}

// In agent configuration
const technicalTaggerAgent = {
  name: "Technical Tagger",
  extendedCapabilityId: "tagger:technical",
  metadataSpec: {
    schemaId: "tags-v1",
    description: "Produces technical categorization tags",
    examples: [{
      type: "tags",
      version: 1,
      tags: {
        "languages": ["typescript", "python"],
        "frameworks": ["react", "nextjs"],
        "difficulty": ["intermediate"]
      }
    }]
  }
};
```

### 3. Migration-Friendly Implementation
```typescript
// Store both human-readable and structured data
async function createEvaluation(result: EvalResult) {
  // Generate human-readable summary
  const summary = generateSummary(result);
  
  // Extract searchable tags
  const allTags = extractAllTags(result.metadata);
  
  // Extract key scores for filtering
  const keyScores = extractKeyScores(result.metadata);
  
  return await prisma.evaluationVersion.create({
    data: {
      // Traditional fields
      summary,  // "Generated 10 technical tags with high confidence"
      analysis: result.analysis,
      grade: result.overallScore,
      selfCritique: result.selfCritique,
      
      // New metadata fields
      metadata: result.metadata,
      metadataSchema: result.schemaId,
      metadataTags: allTags,      // ["react", "typescript", "intermediate"]
      metadataScores: keyScores    // {"technical": 85, "clarity": 90}
    }
  });
}
```

## Query Patterns

### 1. Basic Queries
```typescript
// Find all documents tagged with "react"
const reactDocs = await prisma.evaluationVersion.findMany({
  where: {
    metadataTags: { has: "react" }
  }
});

// Find high-quality documents
const highQuality = await prisma.evaluationVersion.findMany({
  where: {
    metadataScores: {
      path: ["quality"],
      gte: 80
    }
  }
});
```

### 2. Advanced Queries
```typescript
// Find documents with specific tag combinations
const advancedReactDocs = await prisma.$queryRaw`
  SELECT * FROM "EvaluationVersion"
  WHERE metadata->'tags'->'frameworks' @> '["react"]'
  AND metadata->'tags'->'difficulty' @> '["advanced"]'
`;

// Aggregate tags across documents
const tagFrequency = await prisma.$queryRaw`
  SELECT tag, COUNT(*) as count
  FROM "EvaluationVersion", 
       jsonb_array_elements_text(metadata->'tags'->'technical') as tag
  GROUP BY tag
  ORDER BY count DESC
`;
```

## Practical Examples

### Example 1: Technical Tagger
```json
{
  "summary": "Generated 12 technical tags across 4 categories",
  "metadata": {
    "type": "tags",
    "version": 1,
    "tags": {
      "languages": ["typescript", "javascript"],
      "frameworks": ["react", "nextjs", "tailwind"],
      "concepts": ["hooks", "ssr", "routing"],
      "difficulty": ["intermediate"],
      "quality": ["well-structured", "comprehensive"]
    },
    "confidence": {
      "languages": 0.95,
      "frameworks": 0.90,
      "concepts": 0.85,
      "difficulty": 0.75,
      "quality": 0.80
    },
    "totalTags": 12
  },
  "metadataSchema": "tags-v1",
  "metadataTags": ["typescript", "javascript", "react", "nextjs", "tailwind", "hooks", "ssr", "routing", "intermediate", "well-structured", "comprehensive"],
  "metadataScores": {"overall": 85}
}
```

### Example 2: Quality Rater
```json
{
  "summary": "Rated document across 5 quality dimensions (avg: 78/100)",
  "metadata": {
    "type": "ratings",
    "version": 1,
    "dimensions": {
      "technical_accuracy": {
        "score": 85,
        "confidence": 0.9,
        "notes": "Code examples are correct and follow best practices"
      },
      "clarity": {
        "score": 75,
        "confidence": 0.85,
        "notes": "Some sections could be clearer for beginners"
      },
      "completeness": {
        "score": 70,
        "confidence": 0.8,
        "notes": "Missing error handling discussion"
      },
      "practical_value": {
        "score": 80,
        "confidence": 0.9
      },
      "originality": {
        "score": 80,
        "confidence": 0.7
      }
    }
  },
  "metadataSchema": "ratings-v1",
  "metadataScores": {
    "technical_accuracy": 85,
    "clarity": 75,
    "completeness": 70,
    "practical_value": 80,
    "originality": 80,
    "average": 78
  }
}
```

### Example 3: Key Point Extractor
```json
{
  "summary": "Extracted 3 key points and 5 supporting insights",
  "metadata": {
    "type": "extraction",
    "version": 1,
    "extractionType": "keyPoints",
    "items": [
      {
        "content": "React Server Components fundamentally change the mental model",
        "importance": "critical",
        "metadata": {
          "section": "introduction",
          "confidence": 0.95
        }
      },
      {
        "content": "RSC reduces bundle size by up to 70% in real applications",
        "importance": "high",
        "metadata": {
          "section": "performance",
          "hasEvidence": true
        }
      }
    ]
  },
  "metadataSchema": "extraction-v1",
  "metadataTags": ["react-server-components", "performance", "bundle-size"],
  "metadataScores": {"relevance": 90, "extraction_quality": 85}
}
```

## UI Considerations

### 1. Dynamic Rendering
```typescript
function MetadataDisplay({ evaluation }) {
  if (!evaluation.metadata) {
    return <TraditionalEvalDisplay {...evaluation} />;
  }
  
  switch (evaluation.metadata.type) {
    case "tags":
      return <TagCloud tags={evaluation.metadata.tags} />;
    
    case "ratings":
      return <RatingChart dimensions={evaluation.metadata.dimensions} />;
    
    case "extraction":
      return <ExtractedItems items={evaluation.metadata.items} />;
    
    default:
      return <JsonDisplay data={evaluation.metadata} />;
  }
}
```

### 2. Filtering Interface
```typescript
// Dynamic filters based on metadata type
function EvaluationFilters({ evaluations }) {
  // Collect all unique tags
  const allTags = new Set();
  evaluations.forEach(e => {
    e.metadataTags?.forEach(tag => allTags.add(tag));
  });
  
  // Collect score dimensions
  const scoreDimensions = new Set();
  evaluations.forEach(e => {
    Object.keys(e.metadataScores || {}).forEach(dim => {
      scoreDimensions.add(dim);
    });
  });
  
  return (
    <>
      <TagFilter tags={Array.from(allTags)} />
      <ScoreFilter dimensions={Array.from(scoreDimensions)} />
    </>
  );
}
```

## Migration Strategy

### Phase 1: Add Metadata Field
```sql
ALTER TABLE "EvaluationVersion" 
ADD COLUMN "metadata" JSONB,
ADD COLUMN "metadataSchema" TEXT,
ADD COLUMN "metadataTags" TEXT[] DEFAULT '{}',
ADD COLUMN "metadataScores" JSONB;

CREATE INDEX idx_metadata_tags ON "EvaluationVersion" USING GIN ("metadataTags");
CREATE INDEX idx_metadata_scores ON "EvaluationVersion" USING GIN ("metadataScores");
```

### Phase 2: Create First Metadata Agents
1. Build tagging agent with tags-v1 schema
2. Build rating agent with ratings-v1 schema
3. Test with small document set
4. Validate query patterns

### Phase 3: Gradual Expansion
1. Add more schema types as needed
2. Build UI components for each type
3. Create aggregation views
4. Enable custom schemas

## Benefits of This Approach

1. **Clean Separation**: Human-readable summary stays separate from structured data
2. **Type Safety**: Schema registry provides validation
3. **Queryability**: Extracted fields enable efficient queries
4. **Flexibility**: Easy to add new metadata types
5. **Migration-Friendly**: Can start simple, evolve as needed
6. **Backward Compatible**: Old evaluations work unchanged