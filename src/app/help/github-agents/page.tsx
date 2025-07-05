"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";

const githubAgentDocumentation = `# Creating GitHub Agent Repositories

Learn how to create and structure GitHub repositories for importing agents into Roast My Post.

## Overview

You can now import agents directly from GitHub repositories! This allows you to:
- Version control your agent configurations
- Share agents with the community
- Collaborate on agent development
- Keep instructions in separate files for better organization

## Quick Start

1. Create a new GitHub repository
2. Add an agent configuration file (\`agent.yaml\`)
3. Go to [Create New Agent](/agents/new)
4. Select "GitHub" and enter your repository URL
5. Click "Import from GitHub"

## Repository Structure

### Basic Structure
\`\`\`
my-agent-repo/
├── agent.yaml           # Main configuration file (required)
├── README.md           # Agent documentation (optional)
└── instructions/       # Directory for instruction files (optional)
    ├── primary.md      # Primary instructions
    └── critique.md     # Self-critique instructions
\`\`\`

### Configuration File

Your repository must contain one of these configuration files:
- \`agent.yaml\` or \`agent.yml\`
- \`agent.json\`
- \`.roastmypost.yaml\` or \`.roastmypost.yml\`
- \`roastmypost.yaml\` or \`roastmypost.yml\`

## Configuration Format

### YAML Format (Recommended)

\`\`\`yaml
name: "Academic Paper Reviewer"
description: "Expert academic reviewer focusing on methodology, evidence, and clarity"
providesGrades: true
primaryInstructions: |
  You are an experienced academic reviewer with expertise in research methodology.
  
  When evaluating papers, focus on:
  1. Research methodology and experimental design
  2. Quality and relevance of evidence
  3. Logical flow and argumentation
  4. Writing clarity and structure
  
  Provide specific, actionable feedback for improvement.
selfCritiqueInstructions: |
  Rate your evaluation on a scale of 1-100 based on:
  - Thoroughness (40%): Did I cover all important aspects?
  - Specificity (30%): Are my comments specific and actionable?
  - Balance (30%): Did I note both strengths and weaknesses?
\`\`\`

### JSON Format

\`\`\`json
{
  "name": "SEO Content Optimizer",
  "description": "Analyzes content for SEO best practices and search visibility",
  "providesGrades": false,
  "primaryInstructions": "You are an SEO expert...",
  "selfCritiqueInstructions": null
}
\`\`\`

## Using File References

For longer instructions, you can reference separate files:

\`\`\`yaml
name: "Comprehensive Code Reviewer"
description: "In-depth code review focusing on quality, security, and best practices"
primaryInstructions: ./instructions/primary.md
selfCritiqueInstructions: ./instructions/self-critique.md
providesGrades: true
\`\`\`

Then create the referenced files:

**\`instructions/primary.md\`:**
\`\`\`markdown
# Code Review Instructions

You are an experienced software engineer conducting code reviews...
[Full instructions here]
\`\`\`

## Field Reference

### Required Fields

- **name** (string, max 200 chars): Agent's display name
- **description** (string, max 1000 chars): Brief description of what the agent does

### Optional Fields

- **primaryInstructions** (string, max 50,000 chars): Main instructions for the agent
- **selfCritiqueInstructions** (string, max 20,000 chars): Instructions for self-evaluation
- **providesGrades** (boolean): Whether the agent provides numerical grades
- **extendedCapabilityId** (string): ID for extended capabilities (advanced feature)
- **readme** (string): Detailed documentation (auto-imported from README.md)

## Best Practices

### 1. Use Descriptive Names
✅ "Academic Methodology Reviewer"
✅ "Startup Pitch Deck Advisor"
❌ "Reviewer Agent"
❌ "My Agent"

### 2. Write Clear Descriptions
Include:
- What the agent specializes in
- What types of documents it's best for
- What kind of feedback it provides

### 3. Structure Your Instructions
\`\`\`yaml
primaryInstructions: |
  ## Role
  You are a [specific expert type]...
  
  ## Expertise Areas
  - [Area 1]
  - [Area 2]
  
  ## Evaluation Process
  1. [Step 1]
  2. [Step 2]
  
  ## Output Format
  Provide feedback in these sections...
\`\`\`

### 4. Include Examples
Add concrete examples in your instructions:
\`\`\`yaml
primaryInstructions: |
  ## Examples
  
  For a statement like "Our product increases efficiency by 50%":
  - Highlight: "increases efficiency by 50%"
  - Comment: "This claim needs supporting data. Consider adding specific metrics or case study results."
\`\`\`

### 5. Version Control
Use Git tags for stable versions:
\`\`\`bash
git tag v1.0.0
git push origin v1.0.0
\`\`\`

## Complete Example Repository

Here's a full example of an agent repository:

### \`agent.yaml\`
\`\`\`yaml
name: "Grant Proposal Excellence Checker"
description: "Comprehensive review of grant proposals against funder requirements and best practices"
providesGrades: true
primaryInstructions: ./instructions/main.md
selfCritiqueInstructions: |
  Score your evaluation (1-100):
  - 90-100: Thorough, specific, actionable feedback covering all criteria
  - 70-89: Good coverage with minor gaps
  - 50-69: Basic review, several areas missed
  - Below 50: Insufficient evaluation
\`\`\`

### \`instructions/main.md\`
\`\`\`markdown
# Grant Proposal Review Instructions

## Your Role
You are an experienced grant reviewer who has evaluated hundreds of proposals across multiple funding agencies...

## Review Criteria

### 1. Alignment with Funder Priorities (25%)
- Does the proposal clearly address the funder's stated goals?
- Are the objectives aligned with the funding program?

### 2. Methodology and Feasibility (25%)
- Is the approach scientifically sound?
- Are the methods appropriate for the objectives?
- Is the timeline realistic?

[... continued ...]
\`\`\`

### \`README.md\`
\`\`\`markdown
# Grant Proposal Excellence Checker

This agent provides comprehensive reviews of grant proposals, helping researchers improve their chances of funding success.

## Features
- Checks alignment with funder requirements
- Reviews methodology and feasibility
- Evaluates budget justification
- Assesses broader impacts
- Provides specific improvement suggestions

## Best Used For
- NIH, NSF, and foundation grant proposals
- Pre-submission reviews
- Proposal improvement iterations

## Scoring Rubric
- 90-100: Exceptional proposal, ready for submission
- 80-89: Strong proposal with minor improvements needed
- 70-79: Good foundation but requires significant work
- Below 70: Major revisions required
\`\`\`

## Troubleshooting

### Common Issues

1. **"No agent configuration file found"**
   - Ensure your file is named correctly (e.g., \`agent.yaml\`)
   - Check that it's in the repository root
   - Verify the file is committed and pushed

2. **"Invalid GitHub URL"**
   - Use the full repository URL: \`https://github.com/username/repo\`
   - Don't include file paths or branch names in the URL

3. **"Validation failed"**
   - Check that required fields (name, description) are present
   - Ensure field lengths are within limits
   - Verify YAML/JSON syntax is correct

### GitHub API Rate Limits

If you encounter rate limit errors:
1. Wait an hour for the limit to reset
2. Or add a GitHub token to your environment:
   \`\`\`bash
   export GITHUB_TOKEN=your_personal_access_token
   \`\`\`

## Sharing Your Agents

### Public Repositories
- Anyone can import agents from public repositories
- Consider adding a license file for clarity
- Use the README to document your agent's capabilities

### Private Repositories
- You can import from private repos you have access to
- The import uses your browser's authentication
- Collaborators can also import if they have repo access

## Examples and Templates

### Starter Templates
We maintain example agent repositories at:
- [github.com/roastmypost/agent-examples](https://github.com/roastmypost/agent-examples)

### Community Agents
Browse community-created agents:
- Search GitHub for "roastmypost agent"
- Check our [Discord](https://discord.gg/nsTnQTgtG6) for shared agents

## Advanced Features

### Multi-File Organization
For complex agents, organize instructions into multiple files:
\`\`\`
complex-agent/
├── agent.yaml
├── instructions/
│   ├── main.md
│   ├── examples/
│   │   ├── academic.md
│   │   └── business.md
│   └── rubrics/
│       ├── grading.md
│       └── criteria.md
└── README.md
\`\`\`

Reference sections in your main instructions:
\`\`\`markdown
See examples in ./examples/academic.md for academic paper reviews.
\`\`\`

### Conditional Instructions
Use YAML anchors for reusable sections:
\`\`\`yaml
definitions:
  academic_criteria: &academic_criteria |
    - Methodology rigor
    - Evidence quality
    - Citation appropriateness

primaryInstructions: |
  For academic documents, evaluate:
  *academic_criteria
  
  For business documents, focus on:
  - Market analysis
  - Financial projections
\`\`\`

## Getting Help

- **Documentation**: See [Agent Documentation for Humans](/help/agents-humans)
- **Examples**: Browse [existing agents](/agents)
- **Community**: Join our [Discord](https://discord.gg/nsTnQTgtG6)
- **Support**: Email contact@quantifieduncertainty.org

Happy agent building! 🚀`;

export default function GitHubAgentsPage() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Creating GitHub Agent Repositories
        </h1>
        <CopyMarkdownButton content={githubAgentDocumentation} />
      </div>
      
      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{githubAgentDocumentation}</ReactMarkdown>
      </div>
    </div>
  );
}