# Agent Schema Documentation

**Complete guide to creating and configuring AI agents for document evaluation in RoastMyPost**

> **For Claude Code**: System-specific analysis and helper scripts are in `/claude/README.md`

## Quick Start Guide

Creating an effective agent requires substantial detail and examples. While you only need three core fields, the instructions should be comprehensive:

1. **name**: Descriptive title
2. **purpose**: Choose from ASSESSOR, ADVISOR, ENRICHER, or EXPLAINER
3. **description**: 1-2 sentences explaining what the agent does

Optional but highly recommended:
4. **genericInstructions**: Comprehensive behavior guide (typically 5,000-50,000 words including examples)
5. **readme**: Human-readable documentation for users and future modifiers

Most high-performing agents use only these fields, but pack extensive detail into the instructions. Additional fields should only be added when output types need fundamentally different approaches.

**Important Note**: The `gradeInstructions` field is OPTIONAL. Without it, agents won't provide numerical grades - this is by design. Only add grading if you specifically want scoring functionality.

### Realistic Agent Example (Abbreviated):

````yaml
name: "Technical Documentation Reviewer"
purpose: ASSESSOR
description: "Evaluates technical documentation for clarity, completeness, and accuracy."
genericInstructions: |
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
    
    <user_documentation>
      Information architecture and content strategy expertise.
      Accessibility standards (WCAG) and internationalization.
      Experience with help systems, knowledge bases, and in-app guidance.
    </user_documentation>
  </expertise_areas>

  <evaluation_framework>
    [... abbreviated - full version would be 20-50x longer with extensive examples ...]
  </evaluation_framework>

  <example_evaluations>
    <example category="missing_context">
      <document_excerpt>
        "To configure the webhook, set the endpoint URL in the settings panel."
      </document_excerpt>
      <evaluation>
        <issue>Lacks critical context for implementation</issue>
        <specific_problems>
          - No mention of authentication requirements
          - Missing payload format specification
          - No error handling guidance
          - Unclear which "settings panel" (UI? Config file? API?)
        </specific_problems>
        <suggested_revision>
          "To configure the webhook:
          1. Navigate to Settings > Integrations > Webhooks
          2. Click 'Add Webhook' and provide:
             - Endpoint URL (must be HTTPS)
             - Authentication method (Bearer token or HMAC signature)
             - Events to subscribe to
          3. Test the connection using the 'Send Test Event' button
          
          The webhook will receive POST requests with this payload format:
          ```json
          {
            "event_type": "user.created",
            "timestamp": "2024-01-15T10:30:00Z",
            "data": { ... }
          }
          ```
          
          Ensure your endpoint returns 200 OK within 5 seconds."
        </suggested_revision>
      </evaluation>
    </example>
    
    [... 50+ more detailed examples covering different scenarios ...]
  </example_evaluations>
````

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

#### `genericInstructions`

- **Type**: string (minimum 30 characters if provided)
- **Purpose**: Core behavioral instructions and personality
- **Typical Length**: 5,000-50,000 words for high-quality agents
- **Guidelines**:
  - Define comprehensive expertise and background
  - Include 50+ detailed examples of evaluations
  - Provide extensive rubrics and criteria
  - Cover edge cases and special scenarios
  - Include domain-specific knowledge
- **Essential Components**:
  ```xml
  <role>Detailed background, expertise, experience</role>
  <approach>Comprehensive methodology and framework</approach>
  <evaluation_criteria>Detailed rubrics with examples</evaluation_criteria>
  <example_evaluations>50+ categorized examples</example_evaluations>
  <edge_cases>How to handle special scenarios</edge_cases>
  <domain_knowledge>Terminology, standards, best practices</domain_knowledge>
  <tone>Nuanced guidance for different contexts</tone>
  ```

#### `summaryInstructions`

- **Type**: string (minimum 30 characters if provided)
- **Purpose**: How to generate document summaries
- **Default Behavior**: If not provided, agent uses genericInstructions
- **When to Use**: Only when summary format differs significantly from general approach

#### `commentInstructions`

- **Type**: string (minimum 30 characters if provided)
- **Purpose**: How to generate specific comments on text sections
- **Default Behavior**: If not provided, agent uses genericInstructions
- **When to Use**: Only when comment style needs specific guidance beyond general approach

#### `gradeInstructions`

- **Type**: string (optional)
- **Purpose**: How to assign numerical grades (0-100 scale)
- **Important**: This field is OPTIONAL. Agents without `gradeInstructions` will not provide grades - this is intentional, not a bug. Most agents don't need to grade documents.
- **When to Use**: Only add this field if you want the agent to provide numerical scores
- **Recommended Structure**:
  ```xml
  <grading_criteria>
    <dimension weight="30">Criterion description and standards</dimension>
    <dimension weight="25">Another criterion...</dimension>
  </grading_criteria>
  <scale_interpretation>
    <range score="90-100">Exceptional quality</range>
    <range score="80-89">High quality</range>
  </scale_interpretation>
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

#### `analysisInstructions`

- **Type**: string
- **Purpose**: How to perform detailed analysis
- **Default Behavior**: If not provided, agent uses genericInstructions
- **When to Use**: For complex multi-step analysis requirements

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

**Rationale**: Third-person maintains professional distance and objectivity. Second-person can feel confrontational and assumes the document author will read the evaluation directly, which may not be the case.

### The Reality of Comprehensive Agents

High-quality agents require extensive instructions—typically 5,000 to 50,000 words. This isn't over-engineering; it's providing the depth needed for consistent, expert-level evaluation. Think of it as embedding an expert's lifetime of knowledge into the system.

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

## Real-World Examples

### Academic Research Evaluator (ASSESSOR)

```yaml
name: "Academic Research Evaluator"
purpose: ASSESSOR
description: "Evaluates research papers using rigorous academic standards, focusing on methodology, novelty, and potential impact."
genericInstructions: |
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

gradeInstructions: |
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
genericInstructions: |
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
genericInstructions: |
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
- Are summaryInstructions different from genericInstructions?
- Do commentInstructions add specific guidance not in generic?
- Could gradeInstructions be part of the main instructions?
```

### Step 2: Consolidate with XML

Transform multiple fields into structured generic instructions:

```xml
<!-- Before: Separate fields -->
genericInstructions: "You are an expert..."
summaryInstructions: "Keep summaries to 200 words"
commentInstructions: "Focus on actionable feedback"
gradeInstructions: "Use academic grading scale"

<!-- After: Unified with XML -->
genericInstructions: |
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
genericInstructions field unless there's a specific need for different
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
