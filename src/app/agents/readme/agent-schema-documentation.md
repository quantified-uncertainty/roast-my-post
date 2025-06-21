# Agent Schema Documentation

**Complete guide to creating and configuring AI agents for document evaluation in RoastMyPost**

## Table of Contents

1. [What is an Agent?](#what-is-an-agent)
2. [Agent Types](#agent-types)
3. [Schema Fields Reference](#schema-fields-reference)
4. [Writing Effective Instructions](#writing-effective-instructions)
5. [Real-World Examples](#real-world-examples)
6. [Best Practices](#best-practices)
7. [Extended Capabilities](#extended-capabilities)
8. [Common Patterns](#common-patterns)

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
- **Versioning**: Support multiple versions with change tracking

### Evaluation Workflow

Agents follow a three-step evaluation process:

1. **Thinking**: Agent analyzes the document and plans its approach
2. **Analysis**: Agent generates a comprehensive evaluation summary
3. **Comments**: Agent creates specific feedback tied to text sections

Each step is tracked separately, allowing for transparency in the evaluation process.

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
  - Should be 1-3 sentences
  - Explain the agent's expertise and focus
  - Mention target use cases or document types
- **Examples**:
  - "Evaluates research papers for clarity, methodology, and impact potential using academic standards."
  - "Provides constructive feedback on writing style, structure, and readability for general audiences."
  - "Identifies and verifies external links, checking for accuracy and relevance to document content."

### Optional Fields

#### `genericInstructions`
- **Type**: string (minimum 30 characters if provided)
- **Purpose**: Core behavioral instructions and personality
- **Guidelines**:
  - Define the agent's overall approach and methodology
  - Establish tone, style, and personality
  - Include expertise context and background
  - Specify general evaluation principles
- **Length**: 200-500 words recommended
- **Template Structure**:
  ```
  ## Role & Expertise
  You are a [specific role] with expertise in [domain]...
  
  ## Evaluation Approach  
  When evaluating documents, you should...
  
  ## Tone & Style
  Maintain a [adjective] tone that is [characteristics]...
  ```

#### `summaryInstructions`
- **Type**: string (minimum 30 characters if provided)
- **Purpose**: How to generate document summaries
- **Guidelines**:
  - Specify summary length and format
  - Define key elements to include
  - Clarify target audience level
  - Include structure preferences
- **Length**: 100-200 words recommended
- **Example Elements**:
  - Summary length (e.g., "2-3 paragraphs", "150-200 words")
  - Key components (main thesis, key findings, implications)
  - Audience level (expert, general public, specific field)

#### `commentInstructions`
- **Type**: string (minimum 30 characters if provided)
- **Purpose**: How to generate specific comments on text sections
- **Guidelines**:
  - Define comment style and approach
  - Specify feedback types (strengths, improvements, questions)
  - Include highlighting criteria
  - Set comment frequency expectations
- **Length**: 200-400 words recommended
- **Key Elements**:
  - Comment types (e.g., "methodological concerns", "clarity issues")
  - Feedback balance (strengths vs. improvements)
  - Specificity level (detailed vs. high-level)

#### `gradeInstructions`
- **Type**: string
- **Purpose**: How to assign numerical grades (0-100 scale)
- **Guidelines**:
  - Define clear grading criteria
  - Explain scale interpretation
  - Provide anchor points for different score ranges
  - Include weighting for different aspects
- **Length**: 100-300 words recommended
- **Scale Guidance**:
  - 90-100: Exceptional quality
  - 80-89: High quality
  - 70-79: Good quality
  - 60-69: Adequate quality
  - Below 60: Needs significant improvement

#### `analysisInstructions`
- **Type**: string
- **Purpose**: How to perform detailed analysis
- **Guidelines**:
  - Guide the overall evaluation approach
  - Specify analysis depth and scope
  - Include methodology preferences
  - Define output structure

#### `extendedCapabilityId`
- **Type**: string  
- **Purpose**: Identifier for special agent capabilities
- **Current Options**:
  - `"simple-link-verifier"`: URL validation and link checking
- **Usage**: Only use for agents with specialized workflows beyond standard evaluation

---

## Writing Effective Instructions

### Best Practices

1. **Be Specific**: Use concrete examples and clear criteria rather than vague guidance
2. **Define Tone**: Specify formal/informal, encouraging/critical, expert/accessible style
3. **Set Expectations**: Clarify output format, length, and structure
4. **Include Context**: Explain the agent's expertise area and perspective
5. **Provide Examples**: Show 2-3 examples of desired output style
6. **Balance Requirements**: Don't ask for conflicting goals (e.g., "brief but comprehensive")
7. **Test Iteratively**: Try instructions with sample documents and refine

### Common Pitfalls to Avoid

- **Vague Instructions**: "Be helpful" instead of specific guidance
- **Conflicting Goals**: Asking for both brevity and comprehensiveness
- **Missing Context**: Not explaining the evaluation purpose or audience
- **No Examples**: Leaving output format unclear
- **Unrealistic Expectations**: Asking for capabilities beyond the agent's scope
- **Overly Complex**: Instructions so detailed they confuse rather than guide

### Instruction Template Structure

```markdown
## Role & Expertise
You are a [specific role] with expertise in [domain]. Your background includes [relevant experience/knowledge areas]. You approach evaluation from the perspective of [viewpoint/methodology].

## Evaluation Approach
When evaluating documents, you should:
- Focus on [primary evaluation criteria]
- Pay special attention to [key aspects]
- Consider [context factors]
- Use [specific methodology or framework]

## Output Format
Provide feedback in the following format:
- [Structure requirements]
- [Length specifications]
- [Style guidelines]

## Tone & Style
Maintain a [tone description] that is [characteristics]. Your feedback should be [helpful/direct/encouraging/etc.] and aimed at [target audience].

## Examples
Here are examples of your evaluation style:
[Include 2-3 concrete examples]
```

---

## Real-World Examples

### Academic Research Evaluator (ASSESSOR)

**Configuration:**
- **Name**: "Academic Research Evaluator"
- **Purpose**: ASSESSOR
- **Description**: "Evaluates research papers using academic standards, focusing on methodology, novelty, and potential impact."

**genericInstructions** (excerpt):
```
You are an experienced academic reviewer with expertise across multiple research domains. You evaluate papers using rigorous academic standards, focusing on:

1. **Methodological Rigor**: Experimental design, data collection, analysis methods
2. **Novelty & Significance**: Original contribution to the field
3. **Clarity & Presentation**: Writing quality, structure, figure quality
4. **Impact Potential**: Theoretical and practical implications

Your reviews should be thorough but constructive, helping authors improve their work while maintaining high standards.
```

**gradeInstructions**:
```
Grade papers on a 0-100 scale based on:
- Methodology (30%): Rigor, appropriateness, execution
- Novelty (25%): Original contribution, innovation
- Clarity (25%): Writing, structure, presentation
- Impact (20%): Significance, implications, applications

90+: Exceptional work ready for top-tier venues
80-89: Strong work with minor revisions needed
70-79: Good work requiring moderate revisions
60-69: Adequate work needing substantial improvements
<60: Significant issues requiring major revision
```

### Clarity Coach (ADVISOR)

**Configuration:**
- **Name**: "Clarity Coach"  
- **Purpose**: ADVISOR
- **Description**: "Helps improve writing clarity, structure, and readability for general audiences."

**commentInstructions** (excerpt):
```
Focus on providing actionable suggestions for improving clarity:

1. **Sentence Structure**: Identify overly complex sentences and suggest simplifications
2. **Word Choice**: Flag jargon, unclear terms, or unnecessarily complex language
3. **Flow & Transitions**: Point out areas where ideas don't connect smoothly
4. **Paragraph Structure**: Suggest improvements to organization and coherence

Your comments should be encouraging while being specific about improvements. Always explain WHY a change would help and HOW to implement it.
```

### Research Scholar (ENRICHER)

**Configuration:**
- **Name**: "Research Scholar"
- **Purpose**: ENRICHER  
- **Description**: "Finds and provides relevant external research, references, and resources to enrich document content."

**commentInstructions** (excerpt):
```
Your role is to identify opportunities to add relevant external information:

1. **Missing Citations**: Where claims need academic backing
2. **Related Research**: Relevant studies that support or challenge points
3. **Background Context**: Historical or theoretical background readers might need
4. **Additional Resources**: Tools, datasets, or references that would be valuable

Format suggestions as markdown tables with:
- **Resource**: Title/description
- **Relevance**: How it connects to the text
- **Link**: Direct URL when possible
- **Type**: Paper/tool/dataset/etc.
```

### EA Impact Evaluator (ASSESSOR)

**Configuration:**
- **Name**: "EA Impact Evaluator"
- **Purpose**: ASSESSOR
- **Description**: "Evaluates content through an Effective Altruism lens, focusing on impact, neglectedness, and tractability."

**genericInstructions** (excerpt):
```
You are an expert in Effective Altruism methodology and impact evaluation. You assess content using the ITN framework:

**Importance**: How many people/beings are affected and how significantly?
**Neglectedness**: How much attention/resources does this area currently receive?
**Tractability**: How solvable is this problem with additional resources?

You should:
- Provide concrete estimates with explicit reasoning
- Consider both direct and indirect effects
- Account for uncertainty and model limitations
- Reference EA research and frameworks where relevant
- Think in terms of expected value and cost-effectiveness
```

---

## Best Practices

### Agent Design Principles

1. **Single Purpose Focus**: Each agent should have one clear, well-defined role
2. **Consistent Persona**: Maintain the same voice, expertise, and approach throughout
3. **Clear Criteria**: Define evaluation standards explicitly with measurable components
4. **Balanced Feedback**: Include both strengths and areas for improvement
5. **Actionable Output**: Provide specific, implementable suggestions
6. **Appropriate Scope**: Match the agent's capabilities to realistic expectations

### Implementation Guidelines

1. **Test Iteratively**: Try your agent with sample documents and refine based on results
2. **Monitor Costs**: Be mindful of instruction length vs. evaluation quality trade-offs
3. **Version Control**: Update agents based on user feedback and performance
4. **Document Changes**: Keep notes on what modifications improve agent performance
5. **User Feedback**: Collect and incorporate feedback from agent users
6. **Performance Metrics**: Track agent effectiveness and user satisfaction

### Recommended Instruction Lengths

- **genericInstructions**: 200-500 words (core personality and approach)
- **summaryInstructions**: 100-200 words (format and content guidance)
- **commentInstructions**: 200-400 words (feedback style and criteria)
- **gradeInstructions**: 100-300 words (scoring criteria and scale)
- **analysisInstructions**: 150-300 words (evaluation methodology)

### Quality Indicators

**High-Quality Instructions:**
- Specific, actionable guidance
- Clear examples and templates
- Consistent tone and approach
- Realistic expectations
- Measurable criteria

**Low-Quality Instructions:**
- Vague, generic guidance
- Conflicting requirements
- Unrealistic expectations
- No examples or structure
- Inconsistent tone

---

## Extended Capabilities

Some agents can have special capabilities beyond standard document evaluation using the `extendedCapabilityId` field.

### Available Extended Capabilities

#### `simple-link-verifier`
- **Purpose**: Validates URLs and checks for hallucinated or broken links
- **Workflow**: Uses specialized URL extraction and validation pipeline instead of standard evaluation
- **Output Focus**: Link accuracy, availability, and relevance
- **Special Behavior**: May bypass some standard instruction fields in favor of specialized link analysis

### Creating Extended Capability Agents

When using extended capabilities:
1. **Reduced Instruction Dependency**: Some instruction fields may be optional or ignored
2. **Specialized Workflows**: Agent follows capability-specific evaluation pipeline
3. **Different Output Format**: May produce different types of comments and analysis
4. **Testing Requirements**: Test with documents containing the relevant content type (e.g., links for link verification)

---

## Common Patterns

### Persona-Based Agents

Some effective agents simulate specific experts or viewpoints:

- **Domain Experts**: "Academic Statistician", "UX Designer", "Policy Analyst"
- **Methodology Experts**: "Bayesian Reasoner", "Systems Thinker", "Evidence-Based Reviewer"
- **Style Experts**: "Plain Language Advocate", "Academic Writer", "Technical Communicator"
- **Perspective Agents**: "Devil's Advocate", "Optimistic Reviewer", "Skeptical Analyst"

### Multi-Criteria Evaluation

For complex evaluations, break down into specific criteria:

```
Evaluate documents across four dimensions:
1. **Technical Accuracy** (25%): Factual correctness, methodology
2. **Clarity & Communication** (25%): Writing quality, accessibility  
3. **Novelty & Insight** (25%): Original thinking, new perspectives
4. **Practical Value** (25%): Actionability, real-world applicability
```

### Progressive Evaluation

Structure evaluation from general to specific:

```
1. **Overall Assessment**: Document's main strengths and purpose
2. **Structural Analysis**: Organization, flow, logical progression
3. **Content Analysis**: Accuracy, depth, coverage of key topics
4. **Detailed Feedback**: Specific line-by-line improvements
```

### Audience-Specific Agents

Tailor evaluation to specific audiences:

- **Expert Review**: Focus on methodology, technical accuracy, novelty
- **General Public**: Emphasize clarity, accessibility, engagement
- **Student Learning**: Highlight educational value, comprehension aids
- **Professional Application**: Focus on practical utility, implementation

---

## Tips for LLM-Assisted Agent Creation

When using this documentation with an LLM to create agents:

1. **Be Specific About Purpose**: Clearly state what the agent should evaluate and for whom
2. **Provide Context**: Explain the domain, audience, and use case
3. **Request Examples**: Ask for specific examples of instructions and evaluation criteria
4. **Iterate and Refine**: Use the LLM to improve initial drafts based on this documentation
5. **Test-Driven Creation**: Ask the LLM to simulate agent behavior on sample content
6. **Validation**: Have the LLM check against this schema for completeness and consistency

### Sample Prompt for Agent Creation

```
Using the Agent Schema Documentation, create a [AGENT_TYPE] agent that:
- Evaluates [CONTENT_TYPE] for [TARGET_AUDIENCE]
- Focuses on [KEY_CRITERIA]
- Uses a [TONE_STYLE] approach
- Provides [OUTPUT_TYPE] feedback

Include all required fields and relevant optional fields with specific, actionable instructions following the best practices outlined in the documentation.
```

---

*This documentation serves as a comprehensive guide for creating effective AI agents in the RoastMyPost platform. Use it as a reference when designing new agents or improving existing ones.*