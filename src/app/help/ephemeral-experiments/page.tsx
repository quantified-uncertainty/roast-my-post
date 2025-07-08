"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";

const ephemeralExperimentsGuide = `# Ephemeral Experiments Guide

## What are Ephemeral Experiments?

Ephemeral experiments are temporary evaluation sessions that automatically clean themselves up after a specified time. Think of them as a "sandbox mode" for testing agent configurations and evaluating content without permanently storing the results.

## Why Use Ephemeral Experiments?

### Perfect for:
- **Testing New Ideas**: Try different agent instructions without cluttering your workspace
- **Quick Evaluations**: Get fast feedback on content without permanent storage
- **Comparing Approaches**: Run side-by-side comparisons of different evaluation strategies
- **Learning the Platform**: Experiment freely without worrying about cleanup

### Key Benefits:
- ✨ **Automatic Cleanup**: Resources are deleted after expiration (default: 24 hours)
- 🚀 **Fast Iteration**: Quickly test and refine agent configurations
- 📊 **Full Analytics**: Get complete results and metrics during the experiment
- 🔒 **Private by Default**: Only you can see your experiments

## Getting Started

### Using the API

Create your first experiment with a simple API call:

\`\`\`bash
curl -X POST https://roastmypost.com/api/batches \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "isEphemeral": true,
    "description": "My first experiment",
    "ephemeralAgent": {
      "name": "Test Reviewer",
      "primaryInstructions": "Review for clarity and completeness."
    },
    "documentIds": ["doc_123"]
  }'
\`\`\`

### Understanding Experiment Types

#### 1. **Test Existing Agent**
Use your production agent on test content:
\`\`\`json
{
  "agentId": "agent_production",
  "isEphemeral": true,
  "ephemeralDocuments": {
    "inline": [{
      "title": "Test Content",
      "content": "Content to evaluate..."
    }]
  }
}
\`\`\`

#### 2. **Test New Agent Configuration**
Create a temporary agent with custom instructions:
\`\`\`json
{
  "isEphemeral": true,
  "ephemeralAgent": {
    "name": "Experimental Reviewer",
    "primaryInstructions": "New review approach...",
    "providesGrades": true
  },
  "documentIds": ["doc_123", "doc_456"]
}
\`\`\`

#### 3. **Full Sandbox Mode**
Everything ephemeral - agent and documents:
\`\`\`json
{
  "isEphemeral": true,
  "ephemeralAgent": {
    "name": "Sandbox Agent",
    "primaryInstructions": "Test instructions..."
  },
  "ephemeralDocuments": {
    "inline": [{
      "title": "Sandbox Document",
      "content": "Test content..."
    }]
  }
}
\`\`\`

## Viewing Results

Access your experiment results using the tracking ID:

\`\`\`bash
curl https://roastmypost.com/api/experiments/exp_7a8b9c \\
  -H "Authorization: Bearer YOUR_API_KEY"
\`\`\`

The results include:
- **Overview**: Description, expiration time, status
- **Agent Details**: Configuration used for the experiment
- **Job Statistics**: Progress and success rates
- **Aggregate Metrics**: Average grades, total cost, completion time
- **Individual Results**: Detailed evaluation for each document

## Best Practices

### 1. **Name Your Experiments**
Use descriptive tracking IDs and descriptions:
\`\`\`json
{
  "trackingId": "exp_strict_criteria_v2",
  "description": "Testing stricter grading criteria for technical docs"
}
\`\`\`

### 2. **Set Appropriate Expiration**
- Quick tests: 1-6 hours
- Day-long experiments: 24 hours (default)
- Week-long studies: up to 168 hours (7 days)

### 3. **Compare Side-by-Side**
Run multiple experiments with the same documents but different agents to compare approaches.

## Common Use Cases

### A/B Testing Agent Instructions

Test if more detailed instructions improve evaluation quality:

\`\`\`python
# Experiment A: Current instructions
exp_a = create_experiment(
    agent_config={"primaryInstructions": "Brief review..."},
    documents=test_docs,
    tracking_id="exp_brief_v1"
)

# Experiment B: Detailed instructions
exp_b = create_experiment(
    agent_config={"primaryInstructions": "Detailed review with examples..."},
    documents=test_docs,
    tracking_id="exp_detailed_v1"
)

# Compare results
print(f"Brief: {exp_a['aggregateMetrics']['averageGrade']}")
print(f"Detailed: {exp_b['aggregateMetrics']['averageGrade']}")
\`\`\`

### Testing Edge Cases

Ensure your agent handles unusual content:

\`\`\`javascript
const edgeCases = [
  { title: "Empty", content: "" },
  { title: "Very Long", content: "...".repeat(10000) },
  { title: "Code Only", content: "function test() { return true; }" },
  { title: "Special Chars", content: "Test 🔥 émojis ñ unicode" }
];

const response = await fetch('/api/batches', {
  method: 'POST',
  headers,
  body: JSON.stringify({
    agentId: 'agent_production',
    isEphemeral: true,
    ephemeralDocuments: { inline: edgeCases }
  })
});
\`\`\`

## Limitations

1. **No URL Import**: Currently, you cannot import documents from URLs for ephemeral experiments
2. **Access Control**: Experiments are private to the creator
3. **Rate Limits**: Maximum 10 experiments per hour per user
4. **Size Limits**: Maximum 100 documents per experiment
5. **Expiration**: Maximum 7 days (168 hours)

## Cleanup Process

When an experiment expires:
1. The batch record is deleted
2. Ephemeral agents are removed (if created for the experiment)
3. Ephemeral documents are deleted (if created for the experiment)
4. All evaluations and jobs are removed
5. Regular (non-ephemeral) resources are preserved

## Troubleshooting

### "Experiment not found"
- Check the tracking ID is correct
- Ensure the experiment hasn't expired
- Verify you're logged in as the creator

### "Access denied"
- Only the creator can view experiment results
- Experiments are not shareable between users

### Results not updating
- Jobs may still be processing
- Check job status in the response
- Large experiments may take several minutes

## FAQ

**Q: Can I extend an experiment's expiration?**  
A: No, expiration times are fixed at creation. Create a new experiment if needed.

**Q: Are experiment results included in my usage statistics?**  
A: Yes, API usage and costs from experiments count toward your quotas.

**Q: Can I convert an ephemeral experiment to permanent?**  
A: No, but you can recreate the agent configuration as a permanent agent.

**Q: What happens to running jobs when an experiment expires?**  
A: The cleanup process waits for running jobs to complete before deletion.

## Getting Help

- **API Documentation**: [Full API Reference](/help/api#ephemeral-experiments)
- **Support**: [Discord Community](https://discord.gg/nsTnQTgtG6)
- **Issues**: [GitHub](https://github.com/quantified-uncertainty/roast-my-post/issues)
- **Email**: support@quantifieduncertainty.org`;

export default function EphemeralExperimentsPage() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Ephemeral Experiments
        </h1>
        <CopyMarkdownButton content={ephemeralExperimentsGuide} />
      </div>
      
      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {ephemeralExperimentsGuide}
        </ReactMarkdown>
      </div>
    </div>
  );
}