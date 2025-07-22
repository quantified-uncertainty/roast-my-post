# Concrete Eval Type Examples with Metadata

## Overview
This document provides detailed examples of different evaluation types using the proposed metadata system, showing both the data structure and practical use cases.

## 1. Technical Tagging Evaluation

### Use Case
Automatically categorize technical blog posts and documentation for better discovery and matching with appropriate reviewers.

### Agent Configuration
```typescript
{
  name: "Technical Stack Analyzer",
  extendedCapabilityId: "metadata:tagger:technical",
  metadataSchema: "tags-v1",
  primaryInstructions: `
    Analyze technical content and extract:
    - Programming languages used
    - Frameworks and libraries
    - Technical concepts and patterns
    - Difficulty level
    - Target audience
    
    Be specific and accurate. Only tag things explicitly mentioned or demonstrated.
  `
}
```

### Example Output
```json
{
  "summary": "Identified 15 technical tags across 5 categories for this React performance guide",
  "analysis": "This is an intermediate-level React tutorial focusing on performance optimization. It demonstrates practical use of React.memo, useMemo, and useCallback with TypeScript examples.",
  "grade": 88,
  "selfCritique": "High confidence in framework identification. Some uncertainty about whether the pattern used is exactly the Observer pattern or a variation.",
  
  "metadata": {
    "version": 1,
    "tags": {
      "languages": ["javascript", "typescript"],
      "frameworks": ["react", "react-dom"],
      "libraries": ["lodash", "react-query"],
      "concepts": ["memoization", "render-optimization", "virtual-dom", "hooks"],
      "patterns": ["observer-pattern", "higher-order-components"],
      "difficulty": ["intermediate"],
      "audience": ["frontend-developers", "react-developers"],
      "topics": ["performance", "optimization", "best-practices"]
    },
    "confidence": {
      "languages": 0.95,
      "frameworks": 0.95,
      "libraries": 0.90,
      "concepts": 0.85,
      "patterns": 0.75,
      "difficulty": 0.80,
      "audience": 0.85,
      "topics": 0.90
    },
    "totalCount": 15,
    "timestamp": "2024-01-10T14:30:00Z"
  },
  
  "metadataSchema": "tags-v1",
  "metadataTags": ["javascript", "typescript", "react", "react-dom", "lodash", "react-query", "memoization", "render-optimization", "virtual-dom", "hooks", "observer-pattern", "higher-order-components", "intermediate", "frontend-developers", "react-developers", "performance", "optimization", "best-practices"],
  "metadataScores": {"technical_depth": 85, "tag_quality": 88}
}
```

## 2. Quality Rating Evaluation

### Use Case
Assess documentation quality across multiple dimensions to help readers find high-quality resources and help authors improve.

### Agent Configuration
```typescript
{
  name: "Documentation Quality Assessor",
  extendedCapabilityId: "metadata:rater:quality",
  metadataSchema: "ratings-v1",
  primaryInstructions: `
    Rate documentation quality on these dimensions:
    - Technical Accuracy: Are facts and code examples correct?
    - Clarity: Is it easy to understand?
    - Completeness: Does it cover the topic thoroughly?
    - Examples: Are examples practical and helpful?
    - Structure: Is it well-organized?
    
    Score each 0-100. Be fair but critical.
  `
}
```

### Example Output
```json
{
  "summary": "Rated 5 quality dimensions with average score of 76/100",
  "analysis": "Well-written tutorial with accurate information and good examples. Main weaknesses are incomplete error handling discussion and some organizational issues in the advanced section.",
  "grade": 76,
  "selfCritique": "My assessment of clarity might be biased toward experienced developers. Beginners might find some sections more challenging than my score suggests.",
  
  "metadata": {
    "version": 1,
    "dimensions": {
      "technical_accuracy": {
        "score": 90,
        "confidence": 0.95,
        "notes": "All code examples tested and working. API usage follows current best practices."
      },
      "clarity": {
        "score": 75,
        "confidence": 0.85,
        "notes": "Generally clear but some advanced concepts explained too briefly. Good use of diagrams."
      },
      "completeness": {
        "score": 65,
        "confidence": 0.90,
        "notes": "Missing important topics: error boundaries, testing strategies, accessibility concerns"
      },
      "examples": {
        "score": 85,
        "confidence": 0.90,
        "notes": "Excellent practical examples that build complexity gradually. Code is well-commented."
      },
      "structure": {
        "score": 70,
        "confidence": 0.85,
        "notes": "Good overall flow but advanced topics feel tacked on. Could benefit from reorganization."
      }
    },
    "average": 77,
    "timestamp": "2024-01-10T14:35:00Z"
  },
  
  "metadataSchema": "ratings-v1",
  "metadataScores": {
    "technical_accuracy": 90,
    "clarity": 75,
    "completeness": 65,
    "examples": 85,
    "structure": 70,
    "average": 77
  }
}
```

## 3. Key Points Extraction

### Use Case
Extract and summarize the most important points from long articles for quick review and reference.

### Agent Configuration
```typescript
{
  name: "Key Insights Extractor",
  extendedCapabilityId: "metadata:extractor:keypoints",
  metadataSchema: "extraction-v1",
  primaryInstructions: `
    Extract the most important points from the document:
    - Main thesis or argument
    - Key supporting points
    - Important examples or evidence
    - Actionable takeaways
    
    Rank by importance: critical, high, medium, low
    Include location context when relevant.
  `
}
```

### Example Output
```json
{
  "summary": "Extracted 8 key points including 2 critical insights about React performance",
  "analysis": "Article makes a compelling case for selective optimization rather than premature optimization, backed by real-world examples and performance metrics.",
  "grade": 92,
  "selfCritique": "May have missed some nuanced points about development experience trade-offs when implementing these optimizations.",
  
  "metadata": {
    "version": 1,
    "extractionType": "keyPoints",
    "items": [
      {
        "content": "React re-renders are not inherently bad - unnecessary re-renders are the problem",
        "importance": "critical",
        "location": { "section": "introduction", "paragraph": 2 },
        "confidence": 0.95
      },
      {
        "content": "useMemo and useCallback have their own performance cost - use only when measurably beneficial",
        "importance": "critical", 
        "location": { "section": "common-mistakes", "paragraph": 1 },
        "confidence": 0.95
      },
      {
        "content": "React DevTools Profiler is essential for identifying actual performance bottlenecks",
        "importance": "high",
        "location": { "section": "tools", "paragraph": 3 },
        "confidence": 0.90
      },
      {
        "content": "List virtualization can improve performance by 10-100x for large datasets",
        "importance": "high",
        "location": { "section": "advanced-techniques", "paragraph": 5 },
        "confidence": 0.85
      },
      {
        "content": "Code splitting at route level provides biggest initial performance wins",
        "importance": "medium",
        "location": { "section": "quick-wins", "paragraph": 2 },
        "confidence": 0.85
      }
    ],
    "totalExtracted": 8,
    "timestamp": "2024-01-10T14:40:00Z"
  },
  
  "metadataSchema": "extraction-v1",
  "metadataTags": ["react-performance", "optimization", "profiling", "memoization"],
  "metadataScores": {"extraction_quality": 92, "coverage": 88}
}
```

## 4. Code Security Scanner

### Use Case
Identify potential security vulnerabilities in code examples within documentation.

### Agent Configuration
```typescript
{
  name: "Security Vulnerability Scanner",  
  extendedCapabilityId: "metadata:validator:security",
  metadataSchema: "validation-security-v1",
  primaryInstructions: `
    Scan code examples for security vulnerabilities:
    - XSS (Cross-site scripting)
    - SQL/NoSQL injection
    - Insecure dependencies
    - Exposed secrets
    - CORS misconfigurations
    
    Rate severity: critical, high, medium, low
    Provide remediation suggestions.
  `
}
```

### Example Output
```json
{
  "summary": "Found 3 security issues (1 high, 2 medium) in code examples",
  "analysis": "While the tutorial is educational, some examples demonstrate insecure practices without adequate warnings. The localStorage usage and API key handling need security notes.",
  "grade": 60,
  "selfCritique": "The CORS issue might be intentional for development. Should have checked if there's a production configuration section.",
  
  "metadata": {
    "version": 1,
    "validationType": "security",
    "issues": [
      {
        "type": "exposed_credentials",
        "severity": "high",
        "location": {
          "file": "example-2",
          "line": 15,
          "code": "const API_KEY = 'sk-1234567890abcdef';"
        },
        "description": "Hard-coded API key in example code",
        "remediation": "Use environment variables: process.env.API_KEY",
        "confidence": 0.95
      },
      {
        "type": "insecure_storage", 
        "severity": "medium",
        "location": {
          "file": "auth-example",
          "line": 23,
          "code": "localStorage.setItem('authToken', token);"
        },
        "description": "Storing sensitive tokens in localStorage is vulnerable to XSS",
        "remediation": "Use httpOnly cookies or sessionStorage with proper CSP",
        "confidence": 0.90
      },
      {
        "type": "cors_misconfiguration",
        "severity": "medium",
        "location": {
          "file": "server-setup",
          "line": 8,
          "code": "app.use(cors({ origin: '*' }))"
        },
        "description": "Wildcard CORS allows any origin",
        "remediation": "Specify allowed origins: cors({ origin: ['https://app.example.com'] })",
        "confidence": 0.85
      }
    ],
    "summary_stats": {
      "total_issues": 3,
      "by_severity": {
        "critical": 0,
        "high": 1,
        "medium": 2,
        "low": 0
      },
      "security_score": 60
    },
    "timestamp": "2024-01-10T14:45:00Z"
  },
  
  "metadataSchema": "validation-security-v1",
  "metadataTags": ["security-issue", "exposed-credentials", "insecure-storage", "cors"],
  "metadataScores": {"security": 60, "severity": 70}
}
```

## 5. SEO & Discoverability Analyzer

### Use Case
Analyze content for search engine optimization and discoverability potential.

### Agent Configuration
```typescript
{
  name: "SEO & Discovery Optimizer",
  extendedCapabilityId: "metadata:analyzer:seo",
  metadataSchema: "seo-analysis-v1",
  primaryInstructions: `
    Analyze content for SEO and discoverability:
    - Identify primary and secondary keywords
    - Assess content structure for SEO
    - Extract meta description potential
    - Evaluate readability and engagement
    - Suggest improvements
  `
}
```

### Example Output
```json
{
  "summary": "SEO score 82/100 with strong keyword usage but needs meta optimization",
  "analysis": "Content has excellent keyword density and semantic relevance for 'React performance optimization'. Structure supports featured snippets. Main gap is lack of meta description guidance.",
  "grade": 82,
  
  "metadata": {
    "version": 1,
    "analysisType": "seo",
    "keywords": {
      "primary": ["react performance optimization", "react optimization techniques"],
      "secondary": ["useMemo hook", "useCallback hook", "React.memo", "render optimization"],
      "long_tail": [
        "how to optimize react application performance",
        "react performance best practices 2024",
        "when to use useMemo vs useCallback"
      ]
    },
    "structure": {
      "has_h1": true,
      "h2_count": 8,
      "avg_section_length": 285,
      "has_toc": true,
      "has_conclusion": true
    },
    "readability": {
      "flesch_kincaid_grade": 10.5,
      "avg_sentence_length": 18,
      "technical_term_density": 0.15
    },
    "opportunities": [
      {
        "type": "meta_description",
        "importance": "high",
        "suggestion": "Add focused 150-160 char meta description targeting main keyword"
      },
      {
        "type": "internal_linking",
        "importance": "medium", 
        "suggestion": "Link to related React hooks and performance articles"
      }
    ],
    "seo_scores": {
      "keyword_optimization": 88,
      "structure": 85,
      "readability": 78,
      "technical_seo": 75,
      "overall": 82
    },
    "timestamp": "2024-01-10T14:50:00Z"
  },
  
  "metadataSchema": "seo-analysis-v1",
  "metadataTags": ["seo-optimized", "react", "performance", "tutorial"],
  "metadataScores": {"seo": 82, "readability": 78, "keyword_optimization": 88}
}
```

## Aggregation Examples

### Cross-Evaluation Tag Consensus
When multiple taggers evaluate the same document:

```typescript
// Aggregate tags from 3 different taggers
const aggregatedTags = {
  documentId: "doc-123",
  evaluationCount: 3,
  
  tags: {
    "react": { count: 3, confidence: 0.93 },      // All 3 tagged it
    "typescript": { count: 3, confidence: 0.91 },
    "performance": { count: 3, confidence: 0.88 },
    "advanced": { count: 2, confidence: 0.75 },   // 2 of 3 tagged it
    "hooks": { count: 2, confidence: 0.82 },
    "testing": { count: 1, confidence: 0.65 }     // Only 1 tagged it
  },
  
  consensus_tags: ["react", "typescript", "performance"], // >80% agreement
  disputed_tags: ["testing"],                             // <50% agreement
  
  metadata: {
    evaluations: ["eval-1", "eval-2", "eval-3"],
    aggregated_at: "2024-01-10T15:00:00Z"
  }
};
```

### Multi-Dimension Quality Score
Combining ratings from different quality assessors:

```typescript
const aggregatedQuality = {
  documentId: "doc-123",
  
  dimensions: {
    technical_accuracy: { 
      scores: [90, 88, 92], 
      average: 90, 
      variance: 2 
    },
    clarity: { 
      scores: [75, 80, 72], 
      average: 76, 
      variance: 4 
    },
    completeness: { 
      scores: [65, 70, 68], 
      average: 68, 
      variance: 2.5 
    }
  },
  
  overall_score: 78,
  confidence: 0.88,  // Based on evaluator agreement
  
  insights: {
    strengths: ["technical_accuracy"],
    weaknesses: ["completeness"],
    improving: ["clarity"]  // Trending up over time
  }
};
```

## Query Examples

### Finding Documents by Metadata

```typescript
// Find all intermediate React tutorials
const tutorials = await prisma.evaluationVersion.findMany({
  where: {
    AND: [
      { metadataTags: { has: "react" } },
      { metadataTags: { has: "tutorial" } },
      { metadataTags: { has: "intermediate" } }
    ]
  },
  include: {
    evaluation: {
      include: { document: true }
    }
  }
});

// Find high-quality documentation
const highQualityDocs = await prisma.evaluationVersion.findMany({
  where: {
    metadataScores: {
      path: ["average"],
      gte: 85
    }
  }
});

// Find documents with security issues
const securityIssues = await prisma.evaluationVersion.findMany({
  where: {
    AND: [
      { metadataSchema: "validation-security-v1" },
      { 
        metadata: {
          path: ["summary_stats", "total_issues"],
          gt: 0
        }
      }
    ]
  }
});
```

## UI Display Components

### Tag Cloud Component
```typescript
function TagCloud({ evaluation }) {
  if (!evaluation.metadata?.tags) return null;
  
  const allTags = Object.entries(evaluation.metadata.tags)
    .flatMap(([category, tags]) => 
      tags.map(tag => ({ tag, category, confidence: evaluation.metadata.confidence?.[category] || 1 }))
    );
    
  return (
    <div className="tag-cloud">
      {allTags.map(({ tag, category, confidence }) => (
        <span 
          key={tag}
          className={`tag tag-${category}`}
          style={{ opacity: confidence }}
          title={`${category}: ${Math.round(confidence * 100)}% confident`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
```

### Quality Radar Chart
```typescript
function QualityRadar({ evaluation }) {
  if (!evaluation.metadata?.dimensions) return null;
  
  const dimensions = Object.entries(evaluation.metadata.dimensions)
    .map(([name, data]) => ({
      axis: name.replace(/_/g, ' '),
      value: data.score
    }));
    
  return (
    <RadarChart data={dimensions} />
  );
}
```

These examples demonstrate how the metadata system can support diverse evaluation types while maintaining consistency and queryability. The flexible structure allows for innovation in evaluation types while the formalization ensures reliable data handling.