# Metadata Formalization Strategies

## The Core Problem
We want flexible metadata (tags, ratings, extractions) but need:
- Type safety and validation
- Consistent structure across evaluations
- Evolution without breaking changes
- Easy querying and aggregation

## Formalization Approaches

### 1. Contract-Based System
Each agent declares its metadata contract upfront:

```typescript
interface MetadataContract {
  id: string;                    // "technical-tagger-v1"
  schema: ZodSchema;            // Runtime validation
  examples: any[];              // For documentation
  queryHelpers: QueryHelper[];  // How to query this metadata
}

// Agent registration includes contract
const agent = {
  name: "Technical Tagger",
  metadataContract: {
    id: "technical-tagger-v1",
    schema: z.object({
      tags: z.record(z.array(z.string())),
      confidence: z.record(z.number()),
      reasoning: z.string()
    }),
    examples: [{
      tags: { 
        technical: ["react", "typescript"],
        difficulty: ["intermediate"]
      },
      confidence: { technical: 0.9, difficulty: 0.7 },
      reasoning: "Identified React patterns and TypeScript syntax"
    }],
    queryHelpers: [
      { name: "byTag", path: "tags.*", type: "array-contains" },
      { name: "byConfidence", path: "confidence.*", type: "number-gte" }
    ]
  }
};
```

### 2. Typed Metadata Registry
Central registry of all metadata types:

```typescript
// metadata-registry.ts
export const MetadataTypes = {
  TAGS: "tags",
  RATINGS: "ratings", 
  EXTRACTION: "extraction",
  VALIDATION: "validation",
  ANALYSIS: "analysis"
} as const;

export const MetadataRegistry = {
  [MetadataTypes.TAGS]: {
    currentVersion: "v2",
    schemas: {
      v1: TagsSchemaV1,  // Backward compat
      v2: TagsSchemaV2   // Current
    },
    migrations: {
      "v1->v2": migrateTagsV1ToV2
    }
  },
  [MetadataTypes.RATINGS]: {
    currentVersion: "v1",
    schemas: {
      v1: RatingsSchemaV1
    }
  }
  // ... more types
};

// Helper to get current schema
export function getCurrentSchema(type: keyof typeof MetadataTypes) {
  const reg = MetadataRegistry[type];
  return reg.schemas[reg.currentVersion];
}
```

### 3. Composable Metadata Pattern
Allow combining multiple metadata types:

```typescript
// Single evaluation can produce multiple metadata types
interface CompositeMetadata {
  primary: {
    type: "tags",
    data: TagsMetadata,
    schema: "tags-v2"
  },
  secondary?: Array<{
    type: string,
    data: any,
    schema: string
  }>
}

// Example: Agent that both tags AND rates
const hybridAnalyzer = {
  name: "Comprehensive Analyzer",
  producesMetadata: ["tags", "ratings"],
  
  async analyze(doc) {
    const tags = await generateTags(doc);
    const ratings = await generateRatings(doc);
    
    return {
      summary: `Generated ${tags.totalCount} tags and rated ${ratings.dimensionCount} dimensions`,
      metadata: {
        primary: { type: "tags", data: tags, schema: "tags-v2" },
        secondary: [{ type: "ratings", data: ratings, schema: "ratings-v1" }]
      }
    };
  }
};
```

### 4. Schema Evolution Strategy
Handle schema changes gracefully:

```typescript
// Version 1 schema
const TagsSchemaV1 = z.object({
  tags: z.array(z.string()),          // Flat array
  confidence: z.number()
});

// Version 2 schema (categorized)
const TagsSchemaV2 = z.object({
  tags: z.record(z.array(z.string())), // Categorized
  confidence: z.record(z.number()),     // Per category
  totalCount: z.number()
});

// Migration function
function migrateTagsV1ToV2(v1Data: z.infer<typeof TagsSchemaV1>) {
  return {
    tags: { general: v1Data.tags },
    confidence: { general: v1Data.confidence },
    totalCount: v1Data.tags.length
  };
}

// Reading with migration
async function readMetadata(eval: EvaluationVersion) {
  if (!eval.metadata) return null;
  
  const schemaId = eval.metadataSchema || "unknown";
  const [type, version] = schemaId.split("-");
  
  const registry = MetadataRegistry[type];
  if (!registry) return eval.metadata; // Unknown type, return as-is
  
  // Migrate if needed
  if (version !== registry.currentVersion) {
    const migrationKey = `${version}->${registry.currentVersion}`;
    const migrator = registry.migrations[migrationKey];
    if (migrator) {
      return migrator(eval.metadata);
    }
  }
  
  return eval.metadata;
}
```

## Practical Implementation Path

### Step 1: Define Core Metadata Types
```typescript
// core-metadata-types.ts
export namespace MetadataSchemas {
  export const Tags = z.object({
    version: z.literal(1),
    tags: z.record(z.array(z.string())),
    confidence: z.record(z.number()).optional(),
    totalCount: z.number(),
    timestamp: z.string().datetime()
  });
  
  export const Ratings = z.object({
    version: z.literal(1),
    dimensions: z.record(z.object({
      score: z.number().min(0).max(100),
      confidence: z.number().min(0).max(1).optional(),
      notes: z.string().optional()
    })),
    average: z.number(),
    timestamp: z.string().datetime()
  });
  
  export const Extraction = z.object({
    version: z.literal(1),
    extractionType: z.enum(["keyPoints", "facts", "quotes", "examples"]),
    items: z.array(z.object({
      content: z.string(),
      importance: z.enum(["critical", "high", "medium", "low"]),
      location: z.object({
        section: z.string().optional(),
        paragraph: z.number().optional()
      }).optional(),
      confidence: z.number().optional()
    })),
    totalExtracted: z.number(),
    timestamp: z.string().datetime()
  });
}
```

### Step 2: Create Metadata Builder Helpers
```typescript
// metadata-builders.ts
export class TagsBuilder {
  private tags: Record<string, string[]> = {};
  private confidence: Record<string, number> = {};
  
  addTags(category: string, tags: string[], confidence?: number) {
    this.tags[category] = tags;
    if (confidence) this.confidence[category] = confidence;
    return this;
  }
  
  build(): z.infer<typeof MetadataSchemas.Tags> {
    const totalCount = Object.values(this.tags)
      .reduce((sum, tags) => sum + tags.length, 0);
      
    return {
      version: 1,
      tags: this.tags,
      confidence: this.confidence,
      totalCount,
      timestamp: new Date().toISOString()
    };
  }
}

export class RatingsBuilder {
  private dimensions: Record<string, any> = {};
  
  addRating(dimension: string, score: number, confidence?: number, notes?: string) {
    this.dimensions[dimension] = { score, confidence, notes };
    return this;
  }
  
  build(): z.infer<typeof MetadataSchemas.Ratings> {
    const scores = Object.values(this.dimensions).map(d => d.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    return {
      version: 1,
      dimensions: this.dimensions,
      average: Math.round(average),
      timestamp: new Date().toISOString()
    };
  }
}
```

### Step 3: Query Helpers
```typescript
// metadata-queries.ts
export class MetadataQueries {
  // Find documents with specific tags
  static async findByTags(tags: string[], options?: {
    allRequired?: boolean;
    category?: string;
  }) {
    if (options?.category) {
      // Query specific category
      return prisma.evaluationVersion.findMany({
        where: {
          metadata: {
            path: ["tags", options.category],
            array_contains: options.allRequired ? tags : undefined,
            array_overlaps: !options.allRequired ? tags : undefined
          }
        }
      });
    }
    
    // Query all categories
    return prisma.evaluationVersion.findMany({
      where: {
        metadataTags: {
          hasEvery: options?.allRequired ? tags : undefined,
          hasSome: !options?.allRequired ? tags : undefined
        }
      }
    });
  }
  
  // Find documents with high ratings
  static async findHighRated(dimension: string, minScore: number) {
    return prisma.evaluationVersion.findMany({
      where: {
        metadataScores: {
          path: [dimension],
          gte: minScore
        }
      }
    });
  }
  
  // Aggregate tag frequencies
  static async getTagFrequencies(category?: string) {
    const path = category 
      ? `$.tags.${category}[*]`
      : `$.tags.*[*]`;
      
    return prisma.$queryRaw`
      SELECT 
        jsonb_array_elements_text(
          jsonb_path_query_array(metadata, ${path}::jsonpath)
        ) as tag,
        COUNT(*) as frequency
      FROM "EvaluationVersion"
      WHERE metadata IS NOT NULL
      GROUP BY tag
      ORDER BY frequency DESC
    `;
  }
}
```

### Step 4: Validation Layer
```typescript
// metadata-validator.ts
export class MetadataValidator {
  private static schemas = new Map([
    ["tags-v1", MetadataSchemas.Tags],
    ["ratings-v1", MetadataSchemas.Ratings],
    ["extraction-v1", MetadataSchemas.Extraction]
  ]);
  
  static validate(schemaId: string, data: unknown): {
    valid: boolean;
    data?: any;
    errors?: ZodError;
  } {
    const schema = this.schemas.get(schemaId);
    if (!schema) {
      return { valid: false, errors: new Error(`Unknown schema: ${schemaId}`) };
    }
    
    try {
      const validated = schema.parse(data);
      return { valid: true, data: validated };
    } catch (error) {
      return { valid: false, errors: error as ZodError };
    }
  }
  
  static registerSchema(id: string, schema: ZodSchema) {
    this.schemas.set(id, schema);
  }
}

// Use in evaluation creation
async function createEvaluation(agentId: string, result: any) {
  const agent = await getAgent(agentId);
  
  // Validate metadata if present
  if (result.metadata && agent.metadataSchema) {
    const validation = MetadataValidator.validate(
      agent.metadataSchema,
      result.metadata
    );
    
    if (!validation.valid) {
      throw new Error(`Invalid metadata: ${validation.errors}`);
    }
  }
  
  // Continue with creation...
}
```

## Benefits of This Approach

1. **Type Safety**: Zod schemas provide runtime validation
2. **Evolution**: Version tracking and migration support
3. **Flexibility**: New metadata types without schema changes
4. **Query Support**: Both simple and complex queries work
5. **Developer Experience**: Builder patterns and helpers
6. **Backward Compatibility**: Old data continues to work

## Next Steps

1. **Pick Initial Types**: Start with tags and ratings
2. **Implement Registry**: Central place for all schemas
3. **Create First Agent**: Tagging agent with formal schema
4. **Build Query Layer**: Helpers for common queries
5. **Add UI Components**: Type-specific display components