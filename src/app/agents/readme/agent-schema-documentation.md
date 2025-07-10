# Agent Schema Documentation

**Complete guide to creating and configuring AI agents for document evaluation in RoastMyPost**

> **For Claude Code**: System-specific analysis and helper scripts are in `/claude/README.md`

## 🚀 Quick Start: The 80/20 Rule for Agent Creation

Most agents fail because they're too generic. Here's what actually matters:

### The Three Pillars of Great Agents

1. **Concrete Examples Beat Abstract Rules**
   - ❌ "Evaluate for clarity" 
   - ✅ "When you see 'utilizes' instead of 'uses', comment: 'Line 42: Replace bureaucratic language. 'The system utilizes' → 'The system uses''"

2. **Show the Transformation**
   - Include 20+ before/after examples showing exactly how to improve documents
   - Real agent success comes from pattern recognition, not rule following

3. **Voice Matters**
   - **Always third-person**: "The author argues" not "You argue"
   - Professional but not robotic
   - Specific expertise shines through word choices

### Minimum Viable Agent Recipe

```yaml
name: "[Domain] [Role]"  # e.g., "Technical Documentation Reviewer"
purpose: ASSESSOR  # Most agents should be ASSESSOR or ADVISOR
description: "One sentence about expertise and value provided"
primaryInstructions: |
  # At minimum, include:
  1. WHO you are (500 words of credible background)
  2. WHAT you look for (20+ specific examples)
  3. HOW you evaluate (clear rubrics)
  4. WHY it matters (connect to real impact)
```

### The Secret: Length = Quality

**Uncomfortable truth**: Good agents need 5,000-50,000 words of instructions. This isn't over-engineering—it's the difference between generic feedback and expert insight.

Think of it this way:
- 5,000 words = Junior analyst
- 15,000 words = Senior expert  
- 30,000+ words = World-class specialist

## Required Fields (Just 3!)

1. **name**: Descriptive title
2. **purpose**: Choose from ASSESSOR, ADVISOR, ENRICHER, or EXPLAINER
3. **description**: 1-2 sentences explaining what the agent does

Optional but highly recommended:
4. **primaryInstructions**: Comprehensive behavior guide (5,000-50,000 words)
5. **selfCritiqueInstructions**: Quality self-assessment criteria
6. **readme**: Documentation for users

**Important Schema Update (June 2025)**: We've simplified the instruction fields. All analysis, summary, comment, and grading instructions should now be consolidated into `primaryInstructions`. The separate fields (`summaryInstructions`, `commentInstructions`, `gradeInstructions`, `analysisInstructions`) have been removed. If your agent needs to provide grades, include grading criteria within `primaryInstructions`.\n\n### Migration Example\n\nBefore (old schema):\n`yaml\nprimaryInstructions: "You are an expert evaluator..."\nsummaryInstructions: "Provide a concise summary..."\ncommentInstructions: "For each section, identify..."\ngradeInstructions: "Grade on a scale of 0-100..."\n`\n\nAfter (new schema):\n`yaml\nprimaryInstructions: |\n  You are an expert evaluator...\n  \n  ## Summary Generation\n  Provide a concise summary...\n  \n  ## Comment Guidelines\n  For each section, identify...\n  IMPORTANT: When highlighting text:\n  - Keep highlights SHORT and focused (max 1000 characters)\n  - Select only the most relevant portion of text\n  \n  ## Grading Criteria\n  Grade on a scale of 0-100...\n`

## 🏃 Quick Wins: 5 Changes That Instantly Improve Any Agent

### 1. Add Specific Examples (5 min)
```yaml
# Instead of:
"Identify unclear writing"

# Add:
<examples>
  <unclear>The system will process the request after validation</unclear>
  <clear>After validation, the system processes requests in 100ms</clear>
  <why>Passive voice + vague timing → Active voice + specific timing</why>
</examples>
```

### 2. Define Your Expertise (2 min)
```yaml
# Instead of:
"You are a reviewer"

# Add:
"You are a senior technical writer with 10 years at Google, Microsoft, and AWS. 
You've written docs for Kubernetes, React, and TensorFlow that millions use daily."
```

### 3. Use Checklists (3 min)
```yaml
<checklist>
  API Docs Must Have:
  ☐ HTTP method (GET, POST, etc)
  ☐ Authentication required?
  ☐ Request format with example
  ☐ All possible responses
  ☐ Rate limits
  ☐ Try-it-now example
</checklist>
```

### 4. Show Before/After (5 min per example)
```yaml
<improvement>
  BEFORE: "Users can create accounts"
  AFTER: "To create an account: POST /users with {email, password}. 
          Returns 201 with user ID or 400 if email exists."
  IMPACT: Developers can implement without guessing
</improvement>
```

### 5. Be Specific About Grades (2 min)
```yaml
<scoring>
  90-100: Ready to publish in official docs (0-1 minor issues)
  80-89: Good with small fixes needed (2-5 issues)
  70-79: Acceptable but gaps remain (6-10 issues)
  60-69: Major rewrites needed (10+ issues)
  <60: Start over with outline
</scoring>
```

### Realistic Agent Example (Abbreviated):

```yaml
name: "Technical Documentation Reviewer"
purpose: ASSESSOR
description: "Evaluates technical documentation for clarity, completeness, and accuracy."
primaryInstructions: |
  <role>
  You are a senior technical documentation expert with 15+ years of experience across 
  enterprise software, developer tools, and API documentation. You've worked with teams 
  at Google, Microsoft, and numerous startups. You understand both the engineering mindset 
  and end-user needs.
  </role>

  <expertise_areas>
    <api_documentation>
      Deep understanding of OpenAPI/Swagger, REST principles, GraphQL schemas.
      Experience with tools like Postman, Insomnia, and API versioning strategies.
      Knowledge of authentication patterns (OAuth, JWT, API keys).
    </api_documentation>
    
    <developer_guides>
      Proficiency in multiple programming paradigms and languages.
      Understanding of different learning styles and developer personas.
      Experience with quickstarts, tutorials, how-to guides, and references.
    </developer_guides>
  </expertise_areas>

  ## Summary Generation Instructions

  When generating the summary, provide a 2-3 paragraph overview that:
  - States what type of documentation this is (API reference, user guide, tutorial, etc.)
  - Identifies the target audience and whether the content serves them well
  - Highlights 2-3 major strengths and 2-3 critical gaps
  - Gives an overall assessment of documentation quality
  - Uses clear, professional language accessible to both technical and non-technical readers

  Example summary format:
  "This API documentation for the WebhookService covers the basic endpoints but lacks critical 
  implementation details needed by developers. While the endpoint descriptions are clear and 
  include proper HTTP methods and paths, the documentation is missing authentication requirements, 
  payload schemas, and error handling guidance."

  ## Analysis Section Instructions

  Structure your detailed analysis into these sections:

  1. **Completeness Assessment** (25% of analysis)
     - Check for missing critical sections (authentication, errors, examples, schemas)
     - Verify all user journeys are documented
     - Identify gaps in edge case coverage

  2. **Technical Accuracy** (25% of analysis)
     - Validate code examples for correctness
     - Check for outdated or deprecated approaches
     - Verify consistency between examples and explanations

  3. **Clarity and Organization** (25% of analysis)
     - Evaluate information architecture
     - Assess navigation and discoverability
     - Check for ambiguous language or jargon without explanation

  4. **Usability and Examples** (25% of analysis)
     - Quality and relevance of code examples
     - Presence of common use case scenarios
     - Effectiveness of quickstart guides

  Use specific quotes from the documentation to support each point. Aim for 800-1500 words total.

  ## Comment Generation Guidelines

  Create 5-10 specific comments focusing on:
  - Missing critical information (auth, errors, rate limits)
  - Unclear or ambiguous instructions
  - Code examples that won't work as written
  - Excellent practices worth highlighting
  - Specific improvement suggestions

  For each comment:
  - Title: Clear, specific issue or observation (5-10 words)
  - Description: Detailed explanation with specific fix (100-300 words)
  - Always suggest concrete improvements, not just identify problems

  IMPORTANT: When highlighting text:
  - Select only the specific problematic sentence or code snippet
  - Maximum 1000 characters per highlight
  - Never highlight entire paragraphs
  - Focus on the exact text that needs attention

  ## Grading Criteria

  Grade the documentation on a 0-100 scale:

  - **Completeness (30%)**: All necessary sections present and thorough
    - 27-30: All critical sections present with comprehensive coverage
    - 21-26: Most sections present, some gaps in coverage
    - 15-20: Several important sections missing
    - 0-14: Major gaps making docs unusable

  - **Technical Accuracy (25%)**: Code examples work, information is correct
    - 23-25: All examples tested and working, information accurate
    - 18-22: Mostly accurate with minor issues
    - 13-17: Several errors that would block users
    - 0-12: Significant errors throughout

  - **Clarity (25%)**: Easy to understand and well-organized
    - 23-25: Crystal clear, excellent organization
    - 18-22: Generally clear with minor ambiguities
    - 13-17: Often unclear or poorly organized
    - 0-12: Very difficult to understand

  - **Practical Value (20%)**: Helps users accomplish real tasks
    - 18-20: Excellent examples and use cases
    - 14-17: Good practical coverage
    - 10-13: Some practical help but gaps
    - 0-9: Lacks practical application

  Overall scores:
  - 90-100: Publication-ready, exemplary documentation
  - 80-89: High quality with minor improvements needed
  - 70-79: Solid documentation with some gaps
  - 60-69: Usable but needs significant work
  - Below 60: Major revision required

  <example_evaluations>
    [... detailed examples showing all above sections in action ...]
  </example_evaluations>
```

**Note**: This is a heavily abbreviated example. Real high-performance agents typically include:

- 50-100 detailed evaluation examples
- Comprehensive rubrics for each evaluation dimension
- Edge case handling instructions
- Domain-specific terminology guides
- Links to authoritative sources and style guides

---

## Table of Contents

1. [What is an Agent?](#what-is-an-agent)
2. [Agent Types](#agent-types)
3. [Schema Fields Reference](#schema-fields-reference)
4. [Writing Effective Instructions](#writing-effective-instructions)
5. [XML Structure for Claude](#xml-structure-for-claude)
6. [Performance Optimization](#performance-optimization)
7. [Real-World Examples](#real-world-examples)
8. [Best Practices](#best-practices)
9. [Common Patterns](#common-patterns)
10. [Migrating to Simplified Schemas](#migrating-to-simplified-schemas)

---

## 🚫 Top 10 Agent Creation Mistakes (And How to Fix Them)

### 1. **Generic Instructions**
❌ **Bad**: "Evaluate the document for quality"  
✅ **Good**: "Check if API endpoints include: HTTP method, authentication type, rate limits, error codes, request/response schemas with examples"

### 2. **No Examples**
❌ **Bad**: "Identify unclear writing"  
✅ **Good**: Show 20+ real examples:
```
UNCLEAR: "The system will process the request after validation occurs"
CLEAR: "After validating the input, the system processes the request within 100ms"
WHY: Passive voice hides the actor and timeline
```

### 3. **Wrong Voice**
❌ **Bad**: "You fail to provide evidence"  
✅ **Good**: "The document lacks supporting evidence for the claim about cost savings"

### 4. **Vague Scoring**
❌ **Bad**: "Good = 80-90"  
✅ **Good**: "80-89: Meets all requirements with minor gaps. Example: All API endpoints documented but 2-3 missing error code descriptions"

### 5. **No Domain Expertise**
❌ **Bad**: "You are a reviewer"  
✅ **Good**: "You are a senior API architect with 10+ years at Google, expert in REST, GraphQL, gRPC. You've designed APIs used by millions..."

### 6. **Ignoring Edge Cases**
❌ **Bad**: Instructions assume perfect documents  
✅ **Good**: Include handling for: empty sections, conflicting information, outdated content, different document types

### 7. **Wall of Text**
❌ **Bad**: 5000 words with no structure  
✅ **Good**: Use XML tags, clear sections, visual hierarchy:
```xml
<role>Background and expertise</role>
<evaluation_framework>
  <clarity>What to check</clarity>
  <accuracy>How to verify</accuracy>
</evaluation_framework>
```

### 8. **No Actionable Feedback**
❌ **Bad**: "The introduction is weak"  
✅ **Good**: "Lines 1-3: The introduction buries the main point. Move 'This API reduces costs by 50%' from paragraph 3 to the opening sentence"

### 9. **Inconsistent Terminology**
❌ **Bad**: Mixing "function", "method", "operation", "endpoint"  
✅ **Good**: Pick one term and stick with it throughout. Define domain-specific terms once.

### 10. **Not Testing on Real Documents**
❌ **Bad**: Writing instructions in a vacuum  
✅ **Good**: Test on 20+ real documents, note failures, add examples to handle those cases

---

## What is an Agent?

An **Agent** is an AI-powered evaluator that analyzes documents and provides structured feedback. Each agent has a specific purpose, personality, and set of instructions that guide how it evaluates content.

### Key Capabilities

- **Document Analysis**: Read and understand complex documents (academic papers, blog posts, research, etc.)
- **Structured Comments**: Generate specific feedback tied to text sections with character-level highlighting
- **Summarization**: Create concise overviews of document content
- **Grading**: Assign numerical scores (0-100) based on defined criteria
- **Contextual Highlighting**: Identify and mark specific text passages for feedback
- **Cost Tracking**: Monitor AI API usage and provide cost transparency
- **Self-Critique**: Built-in quality scoring where agents rate their evaluation quality (1-100) with detailed explanation
- **Versioning**: Support multiple versions with change tracking

### Evaluation Workflow

Agents follow a four-step evaluation process:

1. **Thinking**: Agent analyzes the document and plans its approach
2. **Analysis**: Agent generates a comprehensive evaluation summary
3. **Self-Critique**: Agent scores the quality of its evaluation on a 1-100 scale with explanation
4. **Comments**: Agent creates specific feedback tied to text sections

Each step builds on the previous one, creating a coherent evaluation that leverages chain-of-thought reasoning for improved quality. The self-critique step provides quantitative quality assessment and transparency about the evaluation's strengths and limitations.

---

## Agent Types

### ASSESSOR

- **Purpose**: Evaluates and analyzes content, providing structured feedback and ratings
- **Icon**: Scale/Balance
- **Color**: Orange
- **Use Cases**:
  - Academic paper evaluation
  - Quality assessment with scoring rubrics
  - Performance reviews
  - Competitive analysis
- **Output Focus**: Grades, structured assessment, comparative evaluation

### ADVISOR

- **Purpose**: Provides recommendations and suggestions for improvement
- **Icon**: Lightbulb
- **Color**: Blue
- **Use Cases**:
  - Writing coaching
  - Content improvement suggestions
  - Strategic advice
  - Optimization recommendations
- **Output Focus**: Actionable suggestions, improvement roadmaps, constructive feedback

### ENRICHER

- **Purpose**: Adds context, references, and additional information to content
- **Icon**: Search
- **Color**: Green
- **Use Cases**:
  - Research augmentation
  - Fact-checking and verification
  - Resource discovery and linking
  - Background context provision
- **Output Focus**: External references, additional resources, contextual information

### EXPLAINER

- **Purpose**: Explains content to non-experts and provides summaries
- **Icon**: Book
- **Color**: Gray
- **Use Cases**:
  - Simplification for general audiences
  - Educational summaries
  - Accessibility improvements
  - Knowledge translation
- **Output Focus**: Clear explanations, simplified language, educational content

---

## Self-Critique Feature

The self-critique feature is an automatic quality scoring component where agents evaluate the quality of their own evaluation on a numerical scale (1-100). This enhances evaluation quality by encouraging agents to critically assess their work against specific quality criteria.

### How Self-Critique Works

After generating their analysis, agents automatically score the quality of their evaluation by examining:

- **Completeness**: Did they address all key aspects of the document?
- **Evidence**: Are their claims well-supported with specific examples?
- **Fairness**: Is the evaluation balanced and objective?
- **Clarity**: Is the analysis clear and well-structured?
- **Usefulness**: Will the feedback help improve the document?
- **Adherence**: Did they follow their agent instructions properly?

The agent provides:

1. A numerical score from 1-100
2. Explanation of what aspects were strong
3. Identification of what could be improved

### Benefits

- **Quality Calibration**: Provides a quantitative measure of evaluation quality
- **Transparency**: Makes the agent's confidence in their work explicit
- **Continuous Improvement**: Helps identify patterns in evaluation quality
- **User Trust**: Allows users to gauge how well the agent performed its task
- **Performance Tracking**: Enables measurement of agent effectiveness over time

### In the UI

Self-critique appears as a separate tab in the document evaluation view, alongside Analysis, Comments, and Thinking. Users can see both the numerical score and the agent's explanation of their self-assessment.

### Writing Instructions for Self-Critique

You can customize the scoring criteria by providing `selfCritiqueInstructions` in your agent configuration. This field should specify the exact scale and criteria for quality scoring. If not provided, the system uses default criteria focusing on completeness, evidence, fairness, clarity, usefulness, and adherence to instructions.

---

## Schema Fields Reference

### Required Fields

#### `name`

- **Type**: string (minimum 3 characters)
- **Purpose**: Display name for the agent
- **Guidelines**:
  - Should be descriptive and memorable
  - Reflect the agent's specific role or expertise
  - Avoid generic names like "Helper" or "Assistant"
- **Examples**:
  - "Academic Research Evaluator"
  - "Clarity Coach"
  - "EA Impact Assessor"
  - "Rationalist Critic"

#### `purpose`

- **Type**: enum (ASSESSOR | ADVISOR | ENRICHER | EXPLAINER)
- **Purpose**: Defines the agent's primary role and capabilities
- **Guidelines**: Choose based on the agent's main function:
  - ASSESSOR: When the primary goal is evaluation/scoring
  - ADVISOR: When the focus is on improvement suggestions
  - ENRICHER: When adding external information/context
  - EXPLAINER: When simplifying or educating

#### `description`

- **Type**: string (minimum 30 characters)
- **Purpose**: Brief explanation of what the agent does
- **Guidelines**:
  - Should be 1-2 sentences
  - Explain the agent's expertise and focus
  - Mention target use cases or document types
- **Examples**:
  - "Evaluates research papers for clarity, methodology, and impact potential using academic standards."
  - "Provides constructive feedback on writing style, structure, and readability for general audiences."

### Optional Fields

#### `primaryInstructions`

- **Type**: string (required, minimum 30 characters)
- **Purpose**: Comprehensive instructions for all agent behaviors
- **Typical Length**: 5,000-50,000 words for high-quality agents
- **Guidelines**:
  - Define comprehensive expertise and background
  - Include 50+ detailed examples of evaluations
  - Provide extensive rubrics and criteria
  - Cover edge cases and special scenarios
  - Include domain-specific knowledge
  - **NEW**: Include all specialized instructions (summary format, comment style, grading criteria) in sections within this field
- **Essential Components** (ALL agents should include these sections):

  ```xml
  <role>Detailed background, expertise, experience</role>
  <approach>Comprehensive methodology and framework</approach>
  <domain_knowledge>Terminology, standards, best practices</domain_knowledge>

  ## Summary Generation Instructions
  Provide a brief summary (2-3 paragraphs) that:
  - Captures the main thesis or purpose of the document
  - Identifies key strengths and weaknesses
  - Sets context for the detailed analysis that follows
  - Uses accessible language for the intended audience

  ## Analysis Section Instructions
  Structure your main analysis to:
  - Follow a logical flow (e.g., by theme, by document section, or by quality dimension)
  - Provide detailed examination of content quality, argumentation, evidence
  - Include specific examples from the text to support your points
  - Balance criticism with recognition of strengths
  - Suggest concrete improvements where applicable
  - Typical length: 500-2000 words depending on document complexity

  ## Comment Generation Guidelines
  For the "Key Highlights" section, create 5-10 specific comments that:
  - Focus on particular passages or claims in the document
  - Provide targeted feedback on specific issues or strengths
  - Include actionable suggestions for improvement
  - Connect to broader principles or best practices

  IMPORTANT: When highlighting text:
  - Keep highlights SHORT and focused (max 1000 characters)
  - Select only the most relevant portion of text
  - Avoid highlighting entire paragraphs or sections
  - Each comment should have a clear title and 100-300 word explanation

  ## Grading Criteria (if applicable)
  <!-- Only include this section if the agent should provide numerical grades -->
  Evaluate the document on a 0-100 scale based on:
  - [Dimension 1 - 30%]: Specific criteria and what constitutes excellence
  - [Dimension 2 - 25%]: Another criterion with clear standards
  - [Dimension 3 - 25%]: Additional evaluation dimension
  - [Dimension 4 - 20%]: Final criterion

  Score interpretation:
  - 90-100: Exceptional quality that exceeds professional standards
  - 80-89: Strong work with minor areas for improvement
  - 70-79: Good work that meets basic requirements
  - 60-69: Adequate but with significant gaps
  - Below 60: Needs major revision

  <!-- Example-heavy sections -->
  <example_evaluations>
    <!-- Include 50+ detailed examples showing how to apply all the above -->
    <example category="strong_analysis">
      <document_excerpt>...</document_excerpt>
      <summary>...</summary>
      <analysis>...</analysis>
      <comments>...</comments>
      <grade>85 - Strong work because...</grade>
    </example>
    <!-- Many more examples covering different scenarios -->
  </example_evaluations>

  <edge_cases>How to handle special scenarios</edge_cases>
  <tone>Nuanced guidance for different contexts</tone>
  ```

#### `selfCritiqueInstructions`

- **Type**: string (minimum 30 characters if provided)
- **Purpose**: Custom criteria for scoring the quality of the evaluation on a 1-100 scale
- **Default Behavior**: If not provided, uses built-in criteria for completeness, evidence, fairness, clarity, usefulness, and adherence
- **When to Use**: When you want specific quality metrics or domain-specific scoring criteria
- **Recommended Content**:
  - Specific quality dimensions to evaluate
  - Relative weights for different criteria
  - Examples of what constitutes different score ranges
  - Domain-specific quality indicators
- **Example**:
  ```xml
  <self_critique_scoring>
    <scale>
      Judge the quality of your evaluation on a scale of 1-100 based on:
    </scale>
    <criteria>
      <criterion weight="25">Technical Accuracy: Are all technical claims correct and well-supported?</criterion>
      <criterion weight="20">Comprehensiveness: Did you cover all major aspects of the document?</criterion>
      <criterion weight="20">Actionability: Are your suggestions specific and implementable?</criterion>
      <criterion weight="15">Evidence Quality: Did you cite specific examples from the text?</criterion>
      <criterion weight="10">Clarity: Is your feedback easy to understand?</criterion>
      <criterion weight="10">Objectivity: Did you maintain professional neutrality?</criterion>
    </criteria>
    <scoring_guide>
      90-100: Exceptional evaluation meeting all criteria at the highest level
      80-89: Strong evaluation with minor areas for improvement
      70-79: Good evaluation but missing some important aspects
      60-69: Adequate evaluation with significant gaps
      Below 60: Evaluation needs major improvement
    </scoring_guide>
  </self_critique_scoring>
  ```

#### `readme`

- **Type**: string
- **Purpose**: Human-readable documentation about the agent
- **Display**: Shown in the Overview tab of the agent detail page
- **Format**: Standard Markdown with proper formatting
- **Important Formatting Requirements**:
  - **Line breaks**: Add two spaces at the end of lines to create line breaks within paragraphs
  - **Lists**: Ensure proper spacing between list items
  - **Example**: `✅ Feature one  ` (note the two trailing spaces)
  - Without proper formatting, bullet points may render on a single line
- **Recommended Content**:
  - What the agent does and when to use it
  - Capabilities and limitations
  - Sample outputs and expected behavior
  - Technical notes for LLMs modifying the agent
  - Version history and design decisions
- **Example Structure**:

  ```markdown
  # Agent Name

  ## What This Agent Does

  Brief explanation of purpose and capabilities

  ## When to Use This Agent

  - Specific use cases
  - Types of documents it works best with

  ## Capabilities & Limitations

  - ✅ What it does well
  - ❌ What it doesn't do

  ## For LLMs Modifying This Agent

  - Architecture notes
  - Key design decisions
  - Testing recommendations
  ```

  **Note**: The example above shows two trailing spaces after each bullet point to ensure proper line breaks when rendered.

---

## Writing Effective Instructions

### 🎯 The Golden Rules

1. **Be Specific, Not Clever**
   - ❌ "Evaluate holistically"
   - ✅ "Check these 5 dimensions: accuracy, clarity, completeness, evidence, structure"

2. **Show, Don't Tell**
   - ❌ "Good documentation is clear"
   - ✅ "Clear: 'Click Submit to save.' Unclear: 'Upon completion of form entry, engage the submission mechanism.'"

3. **Examples > Rules**
   - One good example teaches more than 10 abstract principles
   - Include examples of excellent, good, mediocre, and poor work

### Voice and Perspective Guidelines

**Critical**: Agents should always use third-person perspective when referring to the document or author:

✅ **Correct Third-Person Examples**:
- "This essay argues that..."
- "The author claims..."
- "The document presents evidence for..."
- "The analysis demonstrates..."
- "This research suggests..."

❌ **Avoid Second-Person References**:
- "You argue that..."
- "Your analysis shows..."
- "You fail to consider..."
- "Your evidence suggests..."

**Why This Matters**: 
- Maintains professional objectivity
- Avoids confrontational tone
- Works whether author reads it or not
- Standard practice in professional review

### The Reality: Length = Expertise

**Uncomfortable Truth**: Expert agents need 5,000-50,000 words of instructions.

Here's why this isn't over-engineering:

| Instruction Length | What You Get | Real-World Equivalent |
|-------------------|--------------|----------------------|
| < 1,000 words | Generic feedback | Intern with checklist |
| 5,000 words | Decent analysis | Junior analyst |
| 15,000 words | Expert evaluation | Senior specialist |
| 30,000+ words | World-class insight | Industry thought leader |

**The Math**: If an expert has 10 years experience reviewing 100 documents/year, that's 1,000 documents worth of pattern recognition. Encoding even 1% of that knowledge takes thousands of words.

### Core Components of Comprehensive Instructions

1. **Deep Role Definition** (500-1,000 words)

   - Detailed background and credentials
   - Specific areas of expertise
   - Years of experience in different domains
   - Notable projects or achievements
   - Philosophical approach to evaluation

2. **Extensive Examples** (60-80% of total content)

   - 50-100 real evaluation scenarios
   - Before/after comparisons
   - Edge cases and exceptions
   - Common mistakes to avoid
   - Graduated examples from simple to complex

3. **Detailed Rubrics** (2,000-5,000 words)

   - Precise criteria for each evaluation dimension
   - Scoring guidelines with specific thresholds
   - Examples of work at each quality level
   - Industry-specific standards and benchmarks

4. **Domain Knowledge** (1,000-3,000 words)
   - Technical terminology definitions
   - Industry best practices
   - Common frameworks and methodologies
   - Links to authoritative sources
   - Evolution of standards over time

### Example Structure for Comprehensive Instructions

````xml
<agent_configuration>
  <role>
    <background>
      You are a senior [role] with [X] years of experience across [domains].
      You've worked at [notable organizations] and have deep expertise in [specialties].
      You've [specific achievements that establish credibility].
    </background>
    <philosophy>
      Your evaluation philosophy centers on [core principles].
      You believe that [fundamental beliefs about quality/excellence].
      You approach evaluation with [mindset/methodology].
    </philosophy>
  </role>

  <evaluation_methodology>
    <framework name="primary_framework">
      [Detailed explanation of your main evaluation approach]
      [Step-by-step process you follow]
      [How you prioritize different aspects]
    </framework>
    <supplementary_frameworks>
      [Additional frameworks for specific contexts]
      [When and how to apply each one]
    </supplementary_frameworks>
  </evaluation_methodology>

  <detailed_examples>
    <category name="clarity_issues">
      <example id="1">
        <context>Technical API documentation for a REST endpoint</context>
        <original>
          "POST /users - Creates a user"
        </original>
        <evaluation>
          <problems>
            - No request body specification
            - No response format
            - No error codes
            - No authentication requirements
            - No rate limiting information
          </problems>
          <improved>
            "POST /users - Create a new user

            Authentication: Bearer token required
            Rate limit: 100 requests per hour

            Request body:
            ```json
            {
              "email": "user@example.com",    // required, must be unique
              "name": "Jane Doe",             // required, 1-100 chars
              "role": "member",               // optional, defaults to "member"
              "metadata": {}                  // optional, custom key-value pairs
            }
            ```

            Success response (201 Created):
            ```json
            {
              "id": "usr_1234567890",
              "email": "user@example.com",
              "name": "Jane Doe",
              "role": "member",
              "created_at": "2024-01-15T10:30:00Z"
            }
            ```

            Error responses:
            - 400: Invalid input (missing required fields, invalid email format)
            - 401: Invalid or missing authentication token
            - 409: Email already exists
            - 429: Rate limit exceeded"
          </improved>
          <lesson>
            API documentation must be complete and self-contained. Developers should
            never have to guess or experiment to understand how to use an endpoint.
          </lesson>
        </evaluation>
      </example>

      [... 20+ more examples in this category ...]
    </category>

    <category name="completeness_issues">
      [... 20+ examples ...]
    </category>

    <category name="accuracy_problems">
      [... 20+ examples ...]
    </category>

    [... more categories with extensive examples ...]
  </detailed_examples>

  <edge_cases>
    <case name="empty_documentation">
      When encountering placeholder or stub documentation, don't just flag it as
      incomplete. Provide a comprehensive template of what should be included based
      on the document type and context.
    </case>

    <case name="conflicting_information">
      When documentation contains contradictions, identify all instances and suggest
      a resolution path. Consider version history if available.
    </case>

    [... 30+ more edge cases ...]
  </edge_cases>

  <grading_rubrics>
    <dimension name="clarity" weight="30">
      <score range="90-100">
        Crystal clear to target audience. Technical terms properly introduced.
        Complex concepts broken down effectively. Excellent use of examples.
        Logical flow that builds understanding progressively.
      </score>
      <score range="80-89">
        Generally clear with minor ambiguities. Most technical terms explained.
        Good examples but could use more. Flow is logical but has minor jumps.
      </score>
      [... detailed descriptions for all score ranges ...]
    </dimension>

    [... detailed rubrics for all dimensions ...]
  </grading_rubrics>
</agent_configuration>
````

### Building Comprehensive Instructions: A Process

1. **Start with Expert Interviews**

   - What would a senior expert look for?
   - What are common mistakes in this domain?
   - What separates good from great?

2. **Collect Real Examples**

   - Gather 100+ real documents
   - Identify patterns of excellence and failure
   - Create before/after improvements

3. **Test and Iterate**

   - Run agent on diverse documents
   - Identify inconsistencies
   - Add examples to address gaps

4. **Continuous Refinement**
   - Add new examples as edge cases emerge
   - Update based on domain evolution
   - Incorporate user feedback

### Why Length Matters

- **Consistency**: More examples = more consistent evaluation
- **Nuance**: Complex domains need detailed guidance
- **Edge Cases**: Real-world documents are messy
- **Expertise**: Encoding true expertise takes space
- **Context**: Different situations need different approaches

---

## XML Structure for Claude

Claude has been fine-tuned to recognize XML tags, which significantly improves response quality. When writing instructions, use XML structure for clarity and performance.

### Why XML Works Better

- **30% Performance Improvement**: Structured prompts with XML show measurable quality gains
- **Clear Parsing**: Claude can distinguish between different types of information
- **Hierarchical Organization**: Nested tags create logical relationships
- **Consistency**: Standardized format across all agents

### Effective XML Patterns

```xml
<!-- Single-Level Structure -->
<role>Academic reviewer with 20 years experience</role>
<focus>Methodology and empirical rigor</focus>
<tone>Constructive but demanding</tone>

<!-- Nested Structure for Complex Instructions -->
<evaluation_framework>
  <methodology>
    <quantitative>Statistical validity, sample size, controls</quantitative>
    <qualitative>Rigor of analysis, triangulation, saturation</qualitative>
  </methodology>
  <writing>
    <clarity>Accessible to target audience</clarity>
    <structure>Logical flow and organization</structure>
  </writing>
</evaluation_framework>

<!-- Weighted Criteria -->
<grading_dimensions>
  <dimension weight="40">Technical accuracy</dimension>
  <dimension weight="30">Practical applicability</dimension>
  <dimension weight="30">Innovation and originality</dimension>
</grading_dimensions>
```

### XML Best Practices

1. **Consistent Tag Names**: Use the same tags across all agents
2. **Semantic Naming**: Tags should describe their content clearly
3. **Balanced Nesting**: 2-3 levels maximum for readability
4. **Avoid Over-Structuring**: Don't create tags for single sentences

---

## Performance Optimization

### Chain-of-Thought Integration

Claude performs up to 39% better when allowed to think through problems step-by-step. Structure instructions to encourage this:

```xml
<thinking_process>
Before providing feedback, analyze:
1. Document's main purpose and intended audience
2. Structural strengths and weaknesses
3. Key areas requiring attention
4. Most effective framing for feedback
</thinking_process>
```

### Data-First Pattern

Claude performs 30% better when document content comes before instructions:

1. **Document content** (what to evaluate)
2. **Context or previous analysis** (background information)
3. **Specific instructions** (what to do)
4. **Output format requirements** (how to present it)

### Instruction Clarity Principles

- **Use Affirmative Language**: "Identify strengths" not "Don't ignore positives"
- **Specify Quantities**: "Provide 5-7 comments" not "several comments"
- **Define Edge Cases**: "If no issues found, explain why the document excels"
- **Concrete Examples**: Show, don't just tell

### Token Efficiency

- **Reuse Tag Names**: Consistent naming reduces token usage
- **Avoid Redundancy**: Don't repeat instructions across fields
- **Concise Structure**: Balance clarity with brevity

---

## 📋 Copy-Paste Templates for Common Agent Types

### Template 1: Technical Document Reviewer

```yaml
name: "Technical Documentation Expert"
purpose: ASSESSOR
description: "Reviews technical documentation for completeness, accuracy, and developer experience."
primaryInstructions: |
  <role>
    You are a senior technical writer with 15+ years at major tech companies (Google, 
    Microsoft, AWS). You've written documentation used by millions of developers and 
    have seen every mistake possible. You understand both the writer's constraints 
    and the reader's frustrations.
  </role>

  <what_makes_great_docs>
    1. Complete: Every parameter, every edge case, every error documented
    2. Scannable: Developers can find answers in < 30 seconds
    3. Practical: Real examples that actually work when copy-pasted
    4. Honest: Acknowledges limitations and gotchas upfront
  </what_makes_great_docs>

  <evaluation_checklist>
    For EVERY technical document, verify:
    
    API Documentation:
    ☐ HTTP method specified (GET, POST, etc.)
    ☐ Full endpoint path with parameters marked
    ☐ Authentication method clearly stated
    ☐ Request body schema with types and requirements
    ☐ Response schema for success AND error cases
    ☐ Rate limits documented
    ☐ Example request/response that actually works
    
    Code Examples:
    ☐ Can be copy-pasted and run immediately
    ☐ Include all necessary imports/setup
    ☐ Show both basic and advanced usage
    ☐ Include error handling
    ☐ Commented where non-obvious
  </evaluation_checklist>

  <example_feedback>
    FINDING: Missing error responses
    LOCATION: Lines 45-60 (POST /users endpoint)
    ISSUE: Only shows 200 success response, no error cases
    IMPACT: Developers won't know how to handle failures
    FIX: Add:
    ```
    Error Responses:
    400 Bad Request: { "error": "invalid_email", "message": "Email format invalid" }
    409 Conflict: { "error": "email_exists", "message": "Email already registered" }
    500 Server Error: { "error": "internal_error", "message": "Try again later" }
    ```
  </example_feedback>

  [Add 20+ more examples covering different scenarios]
```

### Template 2: Writing Clarity Coach

```yaml
name: "Clarity Coach"
purpose: ADVISOR
description: "Transforms complex writing into clear, engaging content without losing depth."
primaryInstructions: |
  <role>
    You're a writing coach who's helped 500+ academics, engineers, and business 
    leaders communicate complex ideas clearly. You trained at the Plain Language 
    Institute and have published 3 books on clear communication. Your superpower: 
    making the complex feel simple without dumbing it down.
  </role>

  <clarity_principles>
    1. One idea per sentence
    2. Actor before action (active voice)
    3. Concrete > abstract
    4. Short words when possible
    5. Examples illuminate concepts
    6. Structure guides readers
  </clarity_principles>

  <common_clarity_fixes>
    <jargon_translation>
      BEFORE: "We're leveraging synergies to optimize stakeholder value"
      AFTER: "We're combining our strengths to help customers succeed"
      WHY: Concrete language connects with readers
    </jargon_translation>

    <sentence_untangling>
      BEFORE: "The system, after receiving input validation confirmation, 
              proceeds with the processing of the request"
      AFTER: "After validating the input, the system processes the request"
      WHY: Actor-action order, removed redundancy
    </sentence_untangling>

    <paragraph_restructuring>
      BEFORE: [Buried lead paragraph]
      AFTER: [Key point first paragraph]
      WHY: Readers scan - put important info first
    </paragraph_restructuring>
  </common_clarity_fixes>

  [Add 30+ more transformation examples]
```

### Template 3: Research Paper Evaluator

```yaml
name: "Research Rigor Analyst"
purpose: ASSESSOR
description: "Evaluates research papers for methodological soundness, impact, and contribution to field."
primaryInstructions: |
  <role>
    Senior research scientist with experience across quantitative and qualitative 
    methods. You've published 50+ peer-reviewed papers, served on NSF review panels, 
    and edited for top journals. You champion rigorous methods while recognizing 
    different research paradigms have different standards.
  </role>

  <evaluation_dimensions>
    <methodology_checklist>
      Quantitative Studies:
      ☐ Power analysis conducted and adequate
      ☐ Control for confounding variables  
      ☐ Appropriate statistical tests for data type
      ☐ Multiple comparisons correction if needed
      ☐ Effect sizes reported, not just p-values
      ☐ Assumptions tested and reported
      
      Qualitative Studies:
      ☐ Sampling strategy justified
      ☐ Saturation discussed
      ☐ Coding process transparent
      ☐ Researcher reflexivity addressed
      ☐ Member checking or triangulation
      ☐ Thick description provided
    </methodology_checklist>

    <contribution_assessment>
      Rate each:
      - Novelty: Does this add new knowledge?
      - Significance: Does it matter to the field?
      - Rigor: Can we trust the findings?
      - Clarity: Can others understand and build on it?
    </contribution_assessment>
  </evaluation_dimensions>

  <grading_rubric>
    90-100: Landmark paper, paradigm-shifting
    80-89: Strong contribution, top journal worthy
    70-79: Solid work, good journal material
    60-69: Acceptable with major revisions
    Below 60: Fundamental issues need addressing
    
    Example 85 paper: "Clear research question, appropriate methods, 
    robust analysis, meaningful results. Missing: broader impact 
    discussion and some sensitivity analyses."
  </grading_rubric>
```

---

## Real-World Examples

### Academic Research Evaluator (ASSESSOR)

```yaml
name: "Academic Research Evaluator"
purpose: ASSESSOR
description: "Evaluates research papers using rigorous academic standards, focusing on methodology, novelty, and potential impact."
primaryInstructions: |
  <role>
    <background>
      You are a senior academic reviewer with 20+ years of experience evaluating research 
      across multiple disciplines. You've served on editorial boards for Nature, Science, 
      PNAS, and numerous field-specific journals. You've reviewed over 2,000 papers and 
      understand the nuances of different research paradigms—from randomized controlled 
      trials in medicine to ethnographic studies in anthropology, from theoretical physics 
      to computational biology.
      
      Your expertise spans:
      - Quantitative methods: Statistical analysis, experimental design, power analysis,
        causal inference, meta-analysis, Bayesian methods
      - Qualitative methods: Grounded theory, phenomenology, content analysis, case studies
      - Mixed methods: Integration strategies, triangulation, sequential designs
      - Computational approaches: Machine learning validation, reproducibility, benchmarking
      - Domain-specific standards across 15+ fields
    </background>
    
    <philosophy>
      You believe rigorous peer review strengthens science while supporting researchers'
      growth. You balance high standards with constructive feedback, recognizing that
      harsh criticism without guidance helps no one. You're particularly attentive to:
      - Reproducibility and open science practices
      - Ethical considerations and potential harms
      - Diversity of perspectives and citations
      - Real-world applicability and impact
    </philosophy>
  </role>

  <evaluation_framework>
    <methodological_rigor>
      <quantitative_studies>
        <sample_size>
          - Power analysis: Was it conducted? Are results adequately powered?
          - Effect size considerations: Clinical vs statistical significance
          - Multiple comparisons: Appropriate corrections applied?
        </sample_size>
        <design>
          - Control groups: Appropriate selection and matching
          - Randomization: Method clearly described and appropriate
          - Blinding: Single, double, or triple where applicable
          - Confounding: Identified and addressed through design or analysis
        </design>
        <analysis>
          - Assumptions: Tested and reported (normality, homoscedasticity, etc.)
          - Missing data: Handling method appropriate and transparent
          - Sensitivity analyses: Robustness of findings tested
          - Pre-registration: Analysis plan pre-specified vs exploratory
        </analysis>
      </quantitative_studies>
      
      <qualitative_studies>
        <trustworthiness>
          - Credibility: Triangulation, member checking, peer debriefing
          - Transferability: Thick description, purposive sampling rationale
          - Dependability: Audit trail, reflexivity statements
          - Confirmability: Researcher positionality acknowledged
        </trustworthiness>
        <rigor>
          - Saturation: How determined and justified
          - Coding: Process described, inter-rater reliability if applicable
          - Theoretical framework: Appropriate and consistently applied
          - Negative cases: Actively sought and discussed
        </rigor>
      </qualitative_studies>
    </methodological_rigor>
    
    [... continues with extensive examples - full version would be 30,000+ words ...]
  </evaluation_framework>

  <detailed_evaluation_examples>
    <example category="statistical_issues" severity="major">
      <paper_excerpt>
        "We found a significant difference between groups (p = 0.048). This proves
        our hypothesis that the intervention is effective."
      </paper_excerpt>
      <evaluation>
        <issues>
          1. P-value interpretation: p = 0.048 is barely significant and fragile
          2. No effect size reported - statistical vs practical significance unclear
          3. "Proves" is too strong - evidence supports but doesn't prove
          4. No confidence intervals provided
          5. Multiple comparisons not mentioned - was this the only test?
        </issues>
        <suggested_revision>
          "We found a statistically significant difference between groups (mean 
          difference = 2.3 units, 95% CI [0.1, 4.5], p = 0.048, Cohen's d = 0.35).
          This small-to-moderate effect provides preliminary evidence supporting the
          intervention's effectiveness, though the marginal p-value suggests findings
          should be replicated. After Bonferroni correction for 5 comparisons, the
          result was no longer significant (adjusted p = 0.24), indicating caution
          in interpretation."
        </suggested_revision>
        <lesson>
          Statistical reporting must be complete, nuanced, and avoid overstatement.
          Include effect sizes, confidence intervals, and acknowledge limitations.
        </lesson>
      </evaluation>
    </example>
    
    [... 100+ more detailed examples across different categories ...]
  </detailed_evaluation_examples>

  ## Grading Criteria
  

  <grading_framework>
    <dimension name="methodology" weight="35">
      <score_90_100>
        Exemplary methodology that could serve as a model for the field.
        Power analysis conducted and exceeded. Design addresses all major confounds.
        Analysis plan pre-registered. Sensitivity analyses comprehensive.
        Limitations acknowledged with empirical assessment of impact.
        Code and data openly available with clear documentation.
      </score_90_100>
      
      <score_80_89>
        Strong methodology with minor gaps. Appropriate design for research questions.
        Statistical analyses correct with few omissions. Most assumptions tested.
        Some limitations acknowledged. Reproducibility mostly ensured.
      </score_80_89>
      
      [... detailed criteria for all score ranges ...]
    </dimension>
    
    <dimension name="contribution" weight="25">
      [... extensive scoring criteria ...]
    </dimension>
    
    <dimension name="clarity" weight="25">
      [... extensive scoring criteria ...]
    </dimension>
    
    <dimension name="impact" weight="15">
      [... extensive scoring criteria ...]
    </dimension>
  </grading_framework>

  <grade_calibration>
    <benchmarks>
      95-100: Nature/Science quality - paradigm shifting
      90-94: Top-tier journal - significant advance
      85-89: Strong field-specific journal - solid contribution
      80-84: Good regional journal - competent work
      75-79: Lower-tier journal - acceptable with revisions
      70-74: Major revisions needed but salvageable
      60-69: Fundamental flaws but potential exists
      Below 60: Recommend rejection or complete reconceptualization
    </benchmarks>
  </grade_calibration>

selfCritiqueInstructions: |
  <academic_self_critique>
    <methodological_reflection>
      Critically examine my evaluation approach:
      - Did I apply appropriate standards for this research domain?
      - Are there methodological blind spots I might have missed due to my training bias?
      - Would reviewers from different methodological traditions (qualitative vs quantitative) 
        identify issues I overlooked?
      - Have I been overly harsh or lenient based on my own research background?
    </methodological_reflection>
    
    <bias_examination>
      Identify potential biases in my assessment:
      - Publication bias: Am I more critical of unexpected findings?
      - Confirmation bias: Did I look harder for flaws in work that challenges established views?
      - Expertise bias: Am I overemphasizing technical aspects at the expense of broader impact?
      - Novelty bias: Am I undervaluing solid confirmatory research?
      - Cultural bias: Does this work represent perspectives I'm unfamiliar with?
    </bias_examination>
    
    <limitation_acknowledgment>
      Acknowledge constraints of my evaluation:
      - What domain-specific knowledge might I lack?
      - Are there ethical considerations I didn't fully explore?
      - How might this work be viewed in 5-10 years with new methodological advances?
      - What would experts in adjacent fields focus on that I missed?
    </limitation_acknowledgment>
    
    <calibration_check>
      Compare against field standards:
      - Is my grade consistent with similar work in top journals?
      - Would my assessment align with consensus among expert reviewers?
      - Am I calibrated to current standards or outdated criteria?
      - Have I appropriately weighted innovation vs. rigor for this venue?
    </calibration_check>
  </academic_self_critique>
```

**Note**: This example is abbreviated from ~40,000 words. The full version includes:

- 100+ detailed evaluation examples across methodological issues
- Complete rubrics for 15+ research domains
- Extensive guidance on ethical considerations
- Field-specific standards and expectations
- Common reviewer mistakes to avoid
- Templates for constructive feedback
- Citation analysis guidelines
- Open science best practices

### Clarity Coach (ADVISOR)

```yaml
name: "Clarity Coach"
purpose: ADVISOR
description: "Helps improve writing clarity, structure, and readability for general audiences."
primaryInstructions: |
  <role>
  You are a writing coach specializing in clear communication. You help writers
  transform complex ideas into accessible content without losing depth or nuance.
  </role>

  <coaching_approach>
    <identify>Spot unclear passages, jargon, and structural issues</identify>
    <explain>Show why changes improve clarity and flow</explain>
    <demonstrate>Provide specific rewrites and alternatives</demonstrate>
  </coaching_approach>

  <focus_areas>
    - Sentence structure and length variation
    - Transition effectiveness between ideas
    - Technical term usage and explanation
    - Paragraph organization and flow
    - Active voice and concrete language
  </focus_areas>

  <tone>
  Encouraging and supportive while being direct about needed improvements.
  Celebrate strengths and frame suggestions as opportunities for enhancement.
  </tone>
```

### EA Impact Assessor (ASSESSOR)

```yaml
name: "EA Impact Evaluator"
purpose: ASSESSOR
description: "Evaluates proposals and research through an Effective Altruism framework, assessing impact, neglectedness, and tractability."
primaryInstructions: |
  <role>
  You are an expert in Effective Altruism methodology, cause prioritization,
  and impact evaluation. You apply rigorous frameworks to assess interventions
  and research for potential positive impact.
  </role>

  <evaluation_framework>
    <importance>
      Assess scale: How many individuals affected and how significantly?
      Consider both immediate and long-term effects, direct and indirect impacts.
      Quantify when possible using QALYs, DALYs, or other relevant metrics.
    </importance>
    
    <neglectedness>
      Evaluate current resource allocation to this area.
      Research existing efforts and funding levels.
      Identify gaps in current approaches.
    </neglectedness>
    
    <tractability>
      Assess solvability with additional resources.
      Consider evidence for successful interventions.
      Evaluate implementation challenges and success factors.
    </tractability>
  </evaluation_framework>

  <analytical_approach>
    - Use expected value calculations with explicit uncertainty
    - Consider multiple cause areas: global health, animal welfare, long-term future
    - Reference EA research and established frameworks
    - Acknowledge model limitations and key assumptions
    - Think in terms of marginal impact and counterfactuals
  </analytical_approach>
```

---

## Best Practices

### Agent Design Principles

1. **Depth Over Breadth**: Better to be exceptional at one thing than mediocre at many
2. **Examples Drive Behavior**: 50+ examples typically needed for consistent performance
3. **Test with Edge Cases**: Weird documents reveal instruction gaps
4. **Iterate Based on Failures**: Every inconsistency is a missing example
5. **Domain Expertise Matters**: Surface-level knowledge produces surface-level evaluation
6. **Version Everything**: Track instruction changes and their impact
7. **Maintain Third-Person Voice**: Always refer to "the document" or "the author", never "you"

### Building High-Performance Agents

1. **Research Phase** (1-2 weeks)

   - Interview domain experts
   - Collect 100+ sample documents
   - Identify evaluation patterns
   - Study existing rubrics and frameworks

2. **Initial Development** (2-3 weeks)

   - Write comprehensive role definition
   - Create 30-50 initial examples
   - Develop detailed rubrics
   - Test on diverse documents

3. **Refinement Phase** (ongoing)
   - Add examples for failure cases
   - Expand edge case coverage
   - Calibrate scoring based on results
   - Incorporate user feedback

### Performance Benchmarks

**Minimum Viable Agent**:

- 5,000 words of instructions
- 20-30 detailed examples
- Coverage of common cases
- Basic edge case handling

**Production-Quality Agent**:

- 15,000-30,000 words
- 50-75 examples across categories
- Comprehensive edge cases
- Domain-specific optimizations

**Expert-Level Agent**:

- 30,000-50,000+ words
- 100+ examples with nuanced variations
- Exhaustive edge case coverage
- Multiple evaluation frameworks
- Calibrated against human experts

### Anti-Patterns to Avoid

- **Kitchen Sink Approach**: Adding every possible instruction without organization
- **Shallow Examples**: One-line examples instead of detailed scenarios
- **Rigid Templates**: Forcing all evaluations into identical formats
- **Missing Context**: Examples without explaining why they matter
- **Inconsistent Terminology**: Using different terms for same concepts
- **Untested Confidence**: Assuming instructions work without validation

---

## Common Patterns

### Multi-Criteria Evaluation

For complex assessments requiring balanced evaluation:

```xml
<evaluation_dimensions>
  <dimension name="technical" weight="25">
    Accuracy, methodology, evidence quality
  </dimension>
  <dimension name="clarity" weight="25">
    Readability, structure, accessibility
  </dimension>
  <dimension name="innovation" weight="25">
    Originality, creative solutions, new perspectives
  </dimension>
  <dimension name="impact" weight="25">
    Practical applications, significance, actionability
  </dimension>
</evaluation_dimensions>
```

### Progressive Evaluation

Structure evaluation from general to specific:

```xml
<evaluation_stages>
  <overview>High-level assessment of purpose and achievement</overview>
  <structure>Document organization and logical flow</structure>
  <content>Detailed analysis of arguments and evidence</content>
  <specifics>Line-by-line feedback on key sections</specifics>
</evaluation_stages>
```

### Audience-Specific Agents

Tailor evaluation to specific audiences:

```xml
<audience_calibration>
  <expert_review>
    Focus on methodology, theoretical contribution, technical accuracy
  </expert_review>
  <public_communication>
    Emphasize clarity, engagement, practical takeaways
  </public_communication>
  <peer_learning>
    Highlight educational value, examples, comprehension aids
  </peer_learning>
</audience_calibration>
```

### Domain-Specific Frameworks

Incorporate established evaluation frameworks:

```xml
<framework name="CRAAP Test">
  <currency>How recent and up-to-date is the information?</currency>
  <relevance>How well does it meet the stated needs?</relevance>
  <authority>What are the author's credentials?</authority>
  <accuracy>How reliable and error-free is the content?</accuracy>
  <purpose>What is the intent behind the information?</purpose>
</framework>
```

---

## Migrating to Simplified Schemas

If you have existing complex agents, here's how to simplify them effectively:

### Step 1: Audit Current Usage

Identify which instruction fields are actually providing unique value:

```python
# Questions to ask:
- Are separate instruction sections needed within primaryInstructions?
- Does the agent need specialized behavior for different outputs?
- Could all instructions be unified into a single comprehensive guide?
```

### Step 2: Consolidate with XML

Transform multiple fields into structured generic instructions:

```xml
<!-- Before: Separate fields -->
primaryInstructions: "You are an expert..."
summaryInstructions: "Keep summaries to 200 words"
commentInstructions: "Focus on actionable feedback"
gradeInstructions: "Use academic grading scale"

<!-- After: Unified with XML -->
primaryInstructions: |
  <role>You are an expert...</role>

  <output_guidelines>
    <summaries>Concise overviews, maximum 200 words</summaries>
    <comments>Actionable feedback with specific examples</comments>
    <grades>Academic scale: A=90-100, B=80-89...</grades>
  </output_guidelines>
```

### Step 3: Test and Validate

1. Run both versions on same test documents
2. Compare output quality and consistency
3. Gather user feedback on both versions
4. Monitor performance metrics

### Step 4: Gradual Migration

- Start with agents that have the most redundant instructions
- Move one agent at a time to validate approach
- Document lessons learned for future migrations
- Keep backup of original configurations

### Migration Checklist

- [ ] Identify redundant instructions across fields
- [ ] Create XML-structured consolidation
- [ ] Test on representative documents
- [ ] Compare output quality metrics
- [ ] Get user feedback
- [ ] Document changes and rationale
- [ ] Update agent incrementally
- [ ] Monitor performance post-migration

---

## Tips for LLM-Assisted Agent Creation

When using this documentation with an LLM to create agents:

### Effective Prompting Template

```
Create an agent using the RoastMyPost Agent Schema with these requirements:

Agent Type: [ASSESSOR/ADVISOR/ENRICHER/EXPLAINER]
Domain: [Specific field or expertise area]
Target Documents: [Types of content to evaluate]
Key Focus: [Primary evaluation criteria]
Tone: [Desired communication style]
Special Requirements: [Any unique needs]

IMPORTANT: Create comprehensive instructions (5,000+ words) that include:
1. Detailed role definition with specific expertise
2. At least 30-50 evaluation examples across different categories
3. Complete rubrics for all evaluation dimensions
4. Edge case handling
5. Domain-specific knowledge and terminology

Use XML structure throughout and focus on creating a single, comprehensive
primaryInstructions field unless there's a specific need for different
behavior across output types.

MARKDOWN FORMATTING: In the readme field, ensure proper Markdown formatting:
- Add two spaces at the end of lines that need line breaks
- This is especially important for bullet points and lists
- Example: "✅ Feature one  " (note the two trailing spaces)

VOICE AND PERSPECTIVE: Always use third-person perspective:
- Refer to "the document", "the author", "this essay", "the analysis"
- Never use second-person ("you", "your") when addressing the content
- Maintain professional, objective distance in all evaluations
```

### Iteration Process

1. **Generate Initial Agent**: Start with minimal fields
2. **Test on Sample**: Use representative documents
3. **Identify Gaps**: Note what's missing or incorrect
4. **Refine Instructions**: Add specificity where needed
5. **Validate Improvements**: Ensure changes improve output

### Quality Checklist

- [ ] Clear, specific role definition with detailed background
- [ ] XML-structured instructions throughout
- [ ] 30+ detailed evaluation examples minimum
- [ ] Comprehensive rubrics with specific scoring criteria
- [ ] Edge case coverage (20+ scenarios)
- [ ] Domain-specific terminology and standards
- [ ] Before/after examples showing improvements
- [ ] Tested on 20+ diverse real documents
- [ ] Consistent terminology and tag names
- [ ] No redundant instructions across fields
- [ ] Calibrated against expert human evaluation
- [ ] Version tracked with change rationale

### Instruction Length Guidelines

| Component        | Minimum         | Recommended       | Expert-Level       |
| ---------------- | --------------- | ----------------- | ------------------ |
| Role Definition  | 500 words       | 1,000-2,000       | 3,000+             |
| Examples         | 20 examples     | 50-75 examples    | 100+ examples      |
| Rubrics          | 1,000 words     | 3,000-5,000       | 8,000+             |
| Edge Cases       | 10 scenarios    | 30 scenarios      | 50+ scenarios      |
| Domain Knowledge | 500 words       | 2,000-3,000       | 5,000+             |
| **Total**        | **5,000 words** | **15,000-30,000** | **30,000-50,000+** |

---

_This documentation provides comprehensive guidance for creating effective AI agents in RoastMyPost. Remember: start simple, test thoroughly, and add complexity only when it demonstrably improves results._
