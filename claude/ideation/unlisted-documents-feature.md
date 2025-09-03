# Unlisted Documents Feature Analysis

**Date**: 2025-09-03  
**Status**: Research & Evaluation  
**Priority**: Medium  

## Executive Summary

Evaluating the addition of an "unlisted" visibility option for documents, similar to YouTube's unlisted videos or Google Docs' "anyone with the link" sharing. Documents would have unique, hard-to-guess URLs that provide access without authentication but aren't publicly discoverable.

## Current State

Documents currently have two visibility modes:
- **Private**: Requires authentication, only owner can access
- **Public**: No authentication required, discoverable by all

## Proposed Feature: Unlisted Documents

### Core Concept
- Documents with cryptographically random URLs (high entropy slugs)
- Accessible without login to anyone with the exact URL
- Not indexed by search engines or listed publicly
- Acts as "capability URLs" - possession of URL grants access

## Security Research Findings

### Industry Implementations

**YouTube Unlisted**
- Uses long random IDs for videos
- Major vulnerability: Third-party sites catalog unlisted videos (65,000+ on UnlistedVideos.com)
- Playlist loophole exposes unlisted videos

**Google Docs "Anyone with link"**
- Widely used but explicitly warns "not suitable for sensitive content"
- URLs can be discovered through referrer headers, browser history

**Notion (2024 Update)**
- Added "Anyone with Published Link" in June 2024
- Implementing additional security features (in progress as of Nov 2024)

### Critical Security Considerations

#### This is NOT True Security
- **Security through obscurity** - convenience feature, not privacy feature
- No protection against URL sharing/forwarding
- Cannot revoke access once link is shared

#### URL Leakage Vectors
1. Browser history (shared/public computers)
2. HTTP Referer headers
3. Server/proxy/CDN logs
4. Email scanners and filters
5. Social media preview crawlers
6. Browser extensions
7. Clipboard managers
8. Chat app link previews

#### Entropy Requirements
- Minimum 128 bits of entropy recommended
- NanoID (21 chars) provides 126 bits - sufficient for unguessability
- UUID v4 provides 122 random bits

## Recommended Implementation

### Database Schema Changes

```sql
-- Add visibility enum
CREATE TYPE "DocumentVisibility" AS ENUM ('private', 'public', 'unlisted');

-- Add to Document table
ALTER TABLE "Document" 
  ADD COLUMN "visibility" "DocumentVisibility" DEFAULT 'private',
  ADD COLUMN "slug" TEXT UNIQUE NOT NULL;
```

### Three-Tier Approach

1. **Private Documents**
   - Full authentication required
   - Use existing UUID system
   - Highest security

2. **Public Documents**  
   - SEO-friendly slugs
   - Indexed and discoverable
   - Social sharing optimized

3. **Unlisted Documents**
   - Cryptographic random slugs (nanoid)
   - No authentication required
   - Not indexed/listed

### Essential Security Features

#### 1. Slug Regeneration
```typescript
// Allow users to "revoke" leaked links
async function regenerateSlug(docId: string) {
  const newSlug = nanoid(21);
  await updateDocumentSlug(docId, newSlug);
  await logSlugRegeneration(docId, reason);
}
```

#### 2. Access Logging
```typescript
// Track all unlisted document access
async function logUnlistedAccess(slug: string, request: Request) {
  await prisma.documentAccess.create({
    slug,
    ip: request.ip,
    userAgent: request.headers['user-agent'],
    timestamp: new Date()
  });
}
```

#### 3. Security Headers
```typescript
// Prevent leakage through referer
response.headers.set('Referrer-Policy', 'no-referrer');
// Prevent embedding
response.headers.set('X-Frame-Options', 'DENY');
```

## Implementation Phases

### Phase 1: Core Feature (Week 1)
- [ ] Add visibility enum to database
- [ ] Add slug field with migration
- [ ] Update privacy service for unlisted logic
- [ ] Basic UI for visibility selection

### Phase 2: Security (Week 2)
- [ ] Implement slug regeneration
- [ ] Add access logging
- [ ] Security headers for unlisted pages
- [ ] Rate limiting for slug enumeration

### Phase 3: UX Polish (Week 3)
- [ ] Clear warning messages about unlisted limitations
- [ ] Copy link functionality
- [ ] Access analytics dashboard
- [ ] Regeneration UI with confirmation

### Phase 4: Advanced (Future)
- [ ] Optional password protection
- [ ] Expiring links
- [ ] View count limits
- [ ] Download restrictions

## Risk Analysis

### Acceptable Use Cases ✅
- Draft documents for review
- Temporary collaboration
- Non-sensitive content sharing
- Public documents not ready for indexing

### Unacceptable Use Cases ❌
- Confidential business documents
- Personal/medical/financial data
- Anything requiring audit trail
- Long-term secure storage

## User Messaging Requirements

### Clear Terminology
```
✅ "Anyone with this link can view"
✅ "Not listed publicly or indexed by search"
❌ "Private link" 
❌ "Secure sharing"
```

### Required Warnings
```
⚠️ "This link can be forwarded to others"
⚠️ "We cannot control who shares this link"
⚠️ "For sensitive content, use Private visibility"
```

## Success Metrics

- Adoption rate of unlisted vs private/public
- Slug regeneration frequency (indicates leaks)
- Support tickets about visibility confusion
- Security incidents related to unlisted docs

## Decision Points

1. **Should we implement slug regeneration?**
   - Yes - essential for user control
   
2. **Should we log unlisted access?**
   - Yes - for security and analytics

3. **Should we allow custom slugs?**
   - No - reduces entropy, enables enumeration

4. **Should unlisted docs expire?**
   - Optional feature for Phase 4

## Recommendation

**PROCEED WITH IMPLEMENTATION** with clear boundaries:

1. Position as convenience feature, not security feature
2. Implement robust slug regeneration 
3. Add comprehensive access logging
4. Provide clear user education
5. Start with basic feature, iterate based on usage

The feature provides genuine value for common use cases while security risks can be mitigated through proper implementation and clear communication.

## Next Steps

1. Review implementation plan with security team
2. Create detailed technical specification
3. Design user interface mockups
4. Plan user education materials
5. Set up monitoring and alerting

---

*This analysis is based on research of industry implementations, security best practices, and platform-specific considerations for RoastMyPost.*