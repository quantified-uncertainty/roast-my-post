"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";

const agentDocumentationForLLMs = `# Evaluator Documentation for LLMs

This technical specification describes how to create and configure AI evaluators for document evaluation in Roast My Post.

## Evaluator Schema

Evaluators are defined using the following TypeScript interface:

\`\`\`typescript
interface Evaluator {
  name: string;                      // Required: Descriptive title
  description: string;               // Required: 1-2 sentence explanation
  primaryInstructions?: string;      // Comprehensive behavior guide (5k-50k words)
  selfCritiqueInstructions?: string; // Self-evaluation scoring criteria
  providesGrades?: boolean;          // Whether evaluator outputs numerical grades
  readme?: string;                   // Human-readable documentation
}
\`\`\`

## Evaluator Configuration

Evaluators are flexible and can be configured for any evaluation purpose through their instructions. Rather than fixed types, evaluators can be tailored to:

- **Evaluate quality** and identify issues
- **Offer suggestions** and actionable improvements
- **Add context** and supplementary information
- **Clarify concepts** and provide explanations
- **Any custom analysis** based on your specific needs

## Primary Instructions Format

The \`primaryInstructions\` field should be structured XML-like sections for optimal LLM parsing:

\`\`\`xml
<role>
Define the evaluator's expertise, background, and perspective.
Include specific credentials and experience.
</role>

<expertise_areas>
  <domain_1>
    Detailed knowledge areas and specializations
  </domain_1>
  <domain_2>
    Additional expertise with specific tools/methods
  </domain_2>
</expertise_areas>

<evaluation_framework>
  Define the criteria and methodology for evaluation
</evaluation_framework>

<output_instructions>
  Specific formatting and content requirements
</output_instructions>
\`\`\`

## Output Structure

Evaluators must produce outputs in this exact JSON structure:

\`\`\`json
{
  "summary": "2-3 paragraph overview of the evaluation",
  "analysis": "Detailed analysis in markdown format (800-1500 words)",
  "comments": [
    {
      "title": "Specific issue or observation (5-10 words)",
      "description": "Detailed explanation with fixes (100-300 words)",
      "highlight": {
        "text": "Exact text from document to highlight",
        "startOffset": 0,
        "endOffset": 100
      }
    }
  ],
  "overallGrade": 85,  // Optional: 0-100 if providesGrades is true
  "gradeComponents": { // Optional: breakdown of grade
    "clarity": 90,
    "completeness": 80,
    "accuracy": 85
  }
}
\`\`\`

## Highlight Requirements

When creating highlights:
- **Maximum length**: 1000 characters
- **Precision**: Select only the most relevant portion
- **Validation**: Text must exactly match document content
- **Character offsets**: Use exact character positions from document start

## Comment Guidelines

Each comment should:
1. Have a clear, specific title (5-10 words)
2. Provide detailed explanation (100-300 words)
3. Include actionable suggestions
4. Reference specific text via highlights
5. Maintain professional, constructive tone

## Best Practices

### Instruction Length
- Minimum: 1,000 words for basic evaluators
- Recommended: 5,000-10,000 words for comprehensive evaluators
- Maximum: 50,000 words for highly specialized evaluators

### Including Examples
Always include 3-5 detailed examples showing:
- Input document excerpts
- Expected comment format
- Highlight selection strategy
- Grade calculation (if applicable)

### Error Handling
Evaluators should gracefully handle:
- Documents outside their expertise
- Incomplete or malformed content
- Edge cases and unusual formats

## Evaluator Configuration Example

\`\`\`yaml
name: "Technical Documentation Reviewer"
purpose: ASSESSOR
description: "Evaluates technical documentation for clarity, completeness, and accuracy."
providesGrades: true
primaryInstructions: |
  <role>
  You are a senior technical documentation expert with 15+ years of experience 
  across enterprise software, developer tools, and API documentation.
  </role>

  <expertise_areas>
    <api_documentation>
      Deep understanding of OpenAPI/Swagger, REST principles, GraphQL schemas.
      Experience with authentication patterns (OAuth, JWT, API keys).
    </api_documentation>
    
    <developer_guides>
      Proficiency in multiple programming paradigms and languages.
      Understanding of different learning styles and developer personas.
    </developer_guides>
  </expertise_areas>

  ## Evaluation Criteria
  
  1. **Completeness** (25%)
     - All endpoints documented
     - Authentication requirements clear
     - Error responses specified
     - Rate limits documented
  
  2. **Accuracy** (25%)
     - Code examples run without modification
     - API responses match documentation
     - No deprecated patterns
  
  3. **Clarity** (25%)
     - Unambiguous language
     - Well-organized structure
     - Appropriate detail level
  
  4. **Usability** (25%)
     - Helpful examples
     - Common use cases covered
     - Quick start guide present

selfCritiqueInstructions: |
  Rate your evaluation quality:
  - 90-100: Found all major issues, provided actionable fixes
  - 70-89: Identified most issues, suggestions mostly helpful
  - 50-69: Some issues missed, recommendations generic
  - Below 50: Significant gaps in evaluation
\`\`\`

## Integration Notes

- Evaluators are invoked via the \`/api/evaluators/[agentId]/evaluate\` endpoint
- Document content is provided as plain text with character positions preserved
- Responses are validated against the schema before storage
- Failed evaluations are retried with exponential backoff

## Version Control

- Each evaluator modification creates a new version
- Previous versions remain accessible for comparison
- Version history tracks all changes to instructions
`;

export default function AgentsLLMsPage() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Evaluator Documentation for LLMs
        </h1>
        <CopyMarkdownButton content={agentDocumentationForLLMs} />
      </div>
      
      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{agentDocumentationForLLMs}</ReactMarkdown>
      </div>
    </div>
  );
}