"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";

const agentDocumentationForHumans = `# Evaluator Documentation for Humans

Learn how to create and use AI evaluators to evaluate your documents in Roast My Post.

## What Are Evaluators?

Evaluators are AI-powered reviewers that analyze your documents from specific perspectives. Think of them as expert reviewers, each with their own specialty and approach to providing feedback.

## What Can Evaluators Do?

Evaluators can be configured to provide various types of feedback based on their instructions:

### 🎯 Critical Evaluation
- Point out flaws and weaknesses
- Evaluate against specific criteria
- Provide grades and scores
- Best for: Academic papers, technical documentation, grant proposals

**Example**: An academic review evaluator checks research papers for methodology flaws, citation quality, and logical consistency.

### 💡 Constructive Feedback
- Offer actionable recommendations
- Suggest enhancements and alternatives
- Focus on improvements
- Best for: Draft documents, business plans, creative writing

**Example**: A pitch deck reviewer helps refine your presentation with suggestions for clearer messaging and stronger value propositions.

### 📚 Contextual Enhancement
- Provide additional references
- Add historical or cultural context
- Connect to related concepts
- Best for: Educational content, research summaries, wiki articles

**Example**: A context evaluator adds relevant background information and connects your content to broader trends.

### 🔍 Clarification & Simplification
- Break down complex concepts
- Provide analogies and examples
- Make content more accessible
- Best for: Technical content, academic papers, policy documents

**Example**: A technical translator identifies jargon and provides plain-language explanations.

## How to Use Existing Evaluators

1. **Browse Available Evaluators**
   - Go to the [Evaluators page](/evaluators)
   - Read evaluator descriptions to find ones matching your needs
   - Check their descriptions and instructions to understand their approach

2. **Submit Your Document**
   - Upload or paste your document
   - Select one or more evaluators for evaluation
   - Click "Start Evaluation"

3. **Review Feedback**
   - **Summary**: Quick overview of the evaluation
   - **Highlighted Comments**: Specific feedback on document sections
   - **Analysis**: Detailed evaluation narrative
   - **Grades**: Numerical scores (if provided by the evaluator)

## Creating Your Own Evaluator

### Step 1: Define Your Evaluator's Identity

Start with the basics:
- **Name**: Clear, descriptive title (e.g., "SEO Content Optimizer")
- **Description**: 1-2 sentences explaining what your evaluator does
- **Focus**: Define the specific type of analysis your evaluator will provide

### Step 2: Write Primary Instructions

This is where you define your evaluator's behavior. Structure your instructions clearly:

\`\`\`markdown
## Role
You are a [specific type of expert] with experience in [relevant domains].
You specialize in [specific skills or knowledge areas].

## Your Task
When evaluating documents, you will:
1. [First key responsibility]
2. [Second key responsibility]
3. [Third key responsibility]

## Evaluation Framework
[Describe the criteria or methodology your evaluator uses]

## Output Guidelines
- Summary: [What to include in the 2-3 paragraph summary]
- Comments: [Types of issues to highlight and comment on]
- Analysis: [Structure and focus areas for detailed analysis]
\`\`\`

### Step 3: Add Examples

Include 2-3 concrete examples showing:
- Sample document excerpts
- How your evaluator would comment on them
- What text to highlight
- The type of feedback to provide

### Step 4: Set Up Grading (Optional)

If your evaluator provides grades:
- Define what scores mean (e.g., "90-100 = Excellent")
- List specific criteria and their weights
- Explain how to calculate overall scores

### Step 5: Write Self-Critique Instructions (Optional)

Help your evaluator evaluate its own performance:
\`\`\`markdown
Rate your evaluation quality:
- 90-100: Comprehensive, actionable, well-evidenced
- 70-89: Good coverage, mostly helpful
- 50-69: Basic evaluation, some gaps
- Below 50: Significant issues missed
\`\`\`

## Best Practices

### DO:
✅ Be specific about your evaluator's expertise and perspective
✅ Include detailed examples in your instructions
✅ Define clear evaluation criteria
✅ Keep comments constructive and actionable
✅ Test your evaluator on various document types

### DON'T:
❌ Make instructions too brief (aim for 1,000+ words)
❌ Create evaluators that are too general
❌ Forget to specify output format requirements
❌ Use overly critical or harsh language
❌ Duplicate existing evaluators without adding value

## Advanced Features

### Highlight Guidelines
- Keep highlights short and focused (under 1000 characters)
- Select the most relevant portion of text
- Ensure highlights support your comments

### Multi-Domain Evaluators
Create evaluators that evaluate from multiple perspectives:
\`\`\`markdown
<expertise_areas>
  <technical_accuracy>
    Evaluate code examples and technical claims
  </technical_accuracy>
  <readability>
    Assess clarity and accessibility
  </readability>
  <completeness>
    Check for missing information
  </completeness>
</expertise_areas>
\`\`\`

### Conditional Logic
Make your evaluator adaptive:
\`\`\`markdown
If the document is a research paper:
  - Focus on methodology and evidence
  - Check citation quality

If the document is a blog post:
  - Prioritize readability and engagement
  - Evaluate SEO elements
\`\`\`

## Examples of Great Evaluators

### "Grant Proposal Assessor"
- **Purpose**: ASSESSOR
- **Strengths**: Detailed scoring rubric, checks against funder requirements
- **Instructions**: 8,000 words with examples from successful grants

### "Plain Language Advisor"
- **Purpose**: ADVISOR
- **Strengths**: Specific rewriting suggestions, readability metrics
- **Instructions**: 5,000 words with before/after examples

### "Academic Literature Enricher"
- **Purpose**: ENRICHER
- **Strengths**: Adds relevant citations, connects to current research
- **Instructions**: 6,000 words with citation formatting examples

## Getting Help

- **Examples**: Check out [popular evaluators](/evaluators) for inspiration
- **Community**: Join our [Discord](https://discord.gg/nsTnQTgtG6) to discuss evaluator creation

Remember: The best evaluators are specialized, detailed, and provide actionable feedback. Start simple and refine based on results!`;

export default function AgentsHumansPage() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Evaluator Documentation for Humans
        </h1>
        <CopyMarkdownButton content={agentDocumentationForHumans} />
      </div>

      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {agentDocumentationForHumans}
        </ReactMarkdown>
      </div>
    </div>
  );
}
