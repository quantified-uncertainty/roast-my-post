# Agent System Documentation

## Overview

The roast-my-post system uses AI agents to evaluate and analyze documents. Agents are stored in the database with versioning support and are configured using structured instructions.

## Current Implementation

### Database Storage
Agents are stored in the database using the following tables:
- `Agent` - Core agent definition (id, name, description)
- `AgentVersion` - Versioned configurations with instructions and settings

### Agent Configuration Structure

Each agent version contains:

```typescript
interface AgentVersion {
  id: string;
  agentId: string;
  version: string;
  name: string;
  description: string;
  primaryInstructions: string;      // Main evaluation instructions
  selfCritiqueInstructions?: string; // Optional quality scoring criteria
  providesGrades: boolean;          // Whether agent provides numerical grades
  extendedCapabilityId?: string;    // Optional extended capabilities
  createdAt: Date;
  updatedAt: Date;
}
```

### Agent Capabilities

Agents can be configured through their instructions to provide various types of analysis:

#### Assessment & Grading
- **Function**: Provide grades and detailed evaluations
- **Outputs**: Numerical grades (1-100), structured comments with highlights
- **Example**: Academic paper reviewer, writing quality evaluator

#### Recommendations & Improvements
- **Function**: Offer suggestions and strategic advice
- **Outputs**: Actionable recommendations, improvement strategies
- **Example**: Content strategy advisor, optimization consultant

#### Context & Enhancement
- **Function**: Add background information and supplementary content
- **Outputs**: Additional context, related information, expanded explanations
- **Example**: Research context provider, background information enricher

#### Clarification & Explanation
- **Function**: Simplify complex content and improve comprehension
- **Outputs**: Plain-language explanations, accessibility improvements
- **Example**: Technical concept explainer, jargon translator

## Instruction Structure

### Primary Instructions
The `primaryInstructions` field contains the main evaluation logic in sections:

```markdown
## Analysis Instructions
[How to analyze the document]

## Comment Instructions  
[How to generate comments with highlights]

## Summary Instructions
[How to create evaluation summaries]

## Grading Instructions (if providesGrades is true)
[Numerical scoring criteria and rubrics]
```

### Self-Critique Instructions (Optional)
The `selfCritiqueInstructions` provide quality control criteria:

```markdown
## Quality Scoring Criteria
- Accuracy: [criteria for factual correctness]
- Relevance: [criteria for comment relevance] 
- Completeness: [criteria for thoroughness]
- Clarity: [criteria for clear communication]
```

## Creating a New Agent

### 1. Database Creation
Use the admin interface or API to create a new agent:

```typescript
// POST /api/agents
{
  "name": "New Agent Name",
  "description": "What this agent does",
  "primaryInstructions": "...", // Detailed instructions defining agent behavior
  "selfCritiqueInstructions": "...", // Optional quality control criteria
  "providesGrades": true, // true if agent should provide numerical scores
  "extendedCapabilityId": null // Optional
}
```

### 2. Instruction Guidelines

**Primary Instructions should include:**
- Clear analysis methodology
- Specific comment generation rules
- Output format requirements
- Quality standards

**For ASSESSOR agents, also include:**
- Numerical grading rubric (1-100 scale)
- Grade justification requirements
- Consistency criteria

**Self-Critique Instructions should define:**
- Quality metrics for self-evaluation
- Error detection criteria
- Improvement suggestions

### 3. Testing and Validation

Before deploying a new agent:
1. Test with sample documents using the Test tab in agent detail view
2. Review generated evaluations for quality and consistency
3. Check that comments have valid highlights
4. Verify grades (if applicable) align with rubric
5. Run batch evaluations to check performance at scale

## Agent Versioning

### Version Control
- Every modification creates a new agent version
- Previous versions remain accessible for comparison
- Evaluations are linked to specific agent versions
- Rollback to previous versions is supported

### Version Management
- Version numbers are auto-incremented (1.0, 1.1, etc.)
- Breaking changes should increment major version
- Minor improvements increment minor version
- All changes are tracked with timestamps

## Performance Monitoring

### Key Metrics
- **Success Rate**: Percentage of successful evaluations
- **Average Response Time**: Time to complete evaluations
- **Grade Consistency**: Standard deviation of grades (for ASSESSOR agents)
- **Comment Quality**: Validation pass rate for comments
- **Cost Efficiency**: Tokens used per evaluation

### Common Issues
1. **Comment Validation Failures**: Comments must have valid text ranges for highlights
2. **Grade Variance**: High standard deviation indicates inconsistent grading
3. **Token Overuse**: Instructions too verbose or unclear leading to long responses
4. **Timeout Failures**: Complex instructions causing AI response delays

## Best Practices

### Instruction Writing
1. **Be Specific**: Vague instructions lead to inconsistent outputs
2. **Use Examples**: Provide concrete examples of desired outputs
3. **Define Constraints**: Set clear limits on response length and format
4. **Test Iteratively**: Start simple and refine based on results

### Quality Assurance
1. **Regular Review**: Monitor agent performance metrics weekly
2. **Sample Evaluation**: Manually review random evaluations for quality
3. **Comparative Testing**: Run same documents through multiple agents
4. **User Feedback**: Collect feedback from evaluation consumers

### Maintenance
1. **Keep Instructions Current**: Update as requirements evolve
2. **Monitor Costs**: Track token usage and optimize verbose instructions
3. **Version Strategically**: Don't create new versions for minor tweaks
4. **Document Changes**: Maintain clear changelog for each version

## Troubleshooting

### Common Problems

**Agent fails consistently:**
- Check instruction formatting and clarity
- Verify all required instruction sections are present
- Test with simpler documents first

**Comments lack highlights:**
- Ensure comment instructions specify highlight requirements
- Check that text ranges are valid
- Review sample documents for highlighting examples

**Comment structure note:**
- Comments no longer have separate title fields
- Each comment's description should begin with a clear, concise statement
- This opening statement serves as a summary (like a title would)
- Follow with detailed explanation in the rest of the description

**Grades are inconsistent:**
- Refine grading rubric with specific criteria
- Add examples of different grade levels
- Consider using self-critique instructions for consistency

**High token usage:**
- Simplify verbose instructions
- Remove redundant guidance
- Use more specific constraints on response length

### Debugging Tools
1. **Agent Detail View**: Comprehensive metrics and testing interface
2. **Evaluation Logs**: Detailed logs of evaluation processes in `/logs/`
3. **MCP Server**: Direct database queries for analysis
4. **Test Interface**: Safe environment for testing instruction changes

## Migration from Legacy Systems

### Historical Note
Previously, agents were stored as JSON/TypeScript files in `/src/data/agents/`. This system has been deprecated in favor of database storage with versioning support.

### Legacy File Structure (Deprecated)
```typescript
// Old structure - no longer used
export interface EvaluationAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  use_cases: string[];
  limitations: string[];
}
```

The new database approach provides:
- Better version control
- Runtime configuration updates
- Performance tracking
- Easier management through web interface

For reference documentation and schemas, see `/app/agents/readme/agent-schema-documentation.md`.