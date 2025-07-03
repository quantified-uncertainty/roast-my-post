<!-- Created: 2025-06-22 11:27:56 -->
# 2025-06-22 Image Access for Document Analysis

## Problem
Currently, the document analysis system only sends markdown text to Claude. Images in articles are preserved as markdown links (`![alt text](url)`) but Claude cannot see the actual images, limiting its ability to analyze visual content.

## Proposed Solution: Temporary PostgreSQL Storage

### Overview
Implement on-demand image downloading with temporary storage in PostgreSQL, compressed to ~100KB per image, with automatic expiration after 1 hour.

### Implementation Details

#### Database Schema
```prisma
model TemporaryImage {
  id          String   @id @default(uuid())
  documentId  String
  imageUrl    String   
  compressed  Bytes    // 100KB compressed image
  createdAt   DateTime @default(now())
  expiresAt   DateTime // createdAt + 1 hour
  
  @@index([documentId])
  @@index([expiresAt])
}
```

#### Compression Strategy
```typescript
import sharp from 'sharp';

async function compressImage(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(800, null, { withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
}
```

### Performance Analysis

#### On-Demand Processing
- **Download time**: 100-500ms per image
- **Compression time**: 50-200ms per image  
- **Total overhead**: 2-7 seconds for 10 images
- **Acceptable** since jobs run asynchronously

#### Storage Requirements
- **Size per image**: ~100KB compressed
- **Size per document**: ~1MB (10 images)
- **100 documents**: ~10MB total
- **Verdict**: Negligible for PostgreSQL

### Position Preservation

To maintain image-text relationships, use numbered placeholders:

```typescript
// Original markdown
"Some text ![Graph showing results](https://example.com/graph.png) more text"

// Sent to Claude
"Some text ![Image 1: Graph showing results] more text"

// With image array
[{ id: "Image 1", base64: "...", originalUrl: "..." }]
```

### API Integration

Claude's multimodal API format:
```typescript
messages: [{
  role: "user",
  content: [
    { type: "text", text: "Document with ![Image 1: caption] references..." },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "..." } }
  ]
}]
```

### Cleanup Strategy

1. **Automatic expiration**: Set `expiresAt` on creation
2. **Cleanup job**: Daily cron to delete expired images
3. **On-access check**: Delete expired images when fetching

### Benefits of This Approach

1. **No infrastructure changes**: Uses existing PostgreSQL
2. **Fast implementation**: No external services needed
3. **Cost effective**: Minimal storage overhead
4. **Good performance**: Images cached for subsequent analyses
5. **Easy migration**: Can move to S3/R2 later if needed

### Migration Path

If scale demands it, future migration to object storage:
1. Keep same temporary image tracking table
2. Store S3/R2 URLs instead of binary data
3. Use presigned URLs for direct access
4. Set lifecycle policies for auto-deletion

### Implementation Priority

1. Add image downloading to article import
2. Create compression utility
3. Add TemporaryImage model
4. Modify comprehensiveAnalysis to include images
5. Add cleanup job
6. Test with various article sources

This approach provides a pragmatic MVP solution that can scale with the application's needs.