# Ephemeral Experiments

## Overview

Ephemeral experiments allow you to create temporary evaluation environments that automatically clean up after a specified time period. This feature is perfect for:

- Testing new agent configurations without cluttering your workspace
- Running A/B tests on agent prompts
- Evaluating agent performance on specific document sets
- Prototyping without commitment

## Key Features

- **Automatic Cleanup**: Experiments and all associated resources (agents, documents, evaluations) are automatically deleted after expiration
- **Isolated Environment**: Ephemeral resources don't appear in main listings, keeping your workspace clean
- **Visual Indicators**: Experimental resources are clearly marked with badges throughout the UI
- **Tracking IDs**: Human-friendly identifiers for easy reference

## Creating an Experiment

### Via the Web UI

1. Navigate to **Experiments** → **New Experiment**
2. Configure your experiment:
   - **Name**: A descriptive name for your experiment
   - **Description**: Optional details about what you're testing
   - **Expiration**: How long the experiment should last (1-30 days)
   - **Agent Configuration**: Create a new ephemeral agent or select an existing one
   - **Documents**: Upload new documents or select from existing ones

### Via the API

```bash
POST /api/batches
Content-Type: application/json

{
  "trackingId": "my-experiment-v1",
  "name": "Testing new grading rubric",
  "description": "Evaluating if more specific grading criteria improve consistency",
  "isEphemeral": true,
  "expiresInDays": 7,
  
  "ephemeralAgent": {
    "name": "Strict Grader v2",
    "description": "Agent with detailed grading rubric",
    "primaryInstructions": "...",
    "providesGrades": true
  },
  
  "documentIds": ["doc_123", "doc_456"],
  
  "ephemeralDocuments": {
    "source": "text",
    "documents": [
      {
        "title": "Test Document 1",
        "content": "..."
      }
    ]
  }
}
```

## Tracking Experiments

### Experiment List Page

Access your experiments at `/experiments`. This page shows:

- Active and expired experiments (toggle with checkbox)
- Progress bars for job completion
- Time remaining until expiration
- Quick links to view details or delete experiments

### Experiment Details Page

Each experiment has a detailed view at `/experiments/{trackingId}` showing:

- **Metrics**: Success rate, average grades, total cost, processing time
- **Ephemeral Resources**: List of resources created for this experiment
- **Job Progress**: Visual progress bar with completion statistics
- **Results**: Individual evaluation results with grades and summaries
- **Agent Configuration**: Full agent instructions and settings

## Understanding Ephemeral Resources

### Ephemeral Agents

- Created specifically for an experiment
- Marked with "Experimental" badge in the UI
- Not shown in the main agents list
- Automatically deleted when experiment expires

### Ephemeral Documents

- Documents uploaded as part of an experiment
- Only visible within the experiment context
- Cleaned up with the experiment

### Visual Indicators

Look for the purple "Experimental" badge:
- Appears next to resource names
- Hover for details and link to parent experiment
- Helps distinguish temporary from permanent resources

## Expiration and Cleanup

### How Expiration Works

1. Experiments have an `expiresAt` timestamp set during creation
2. A background job runs periodically to check for expired experiments
3. Expired experiments trigger cascade deletion:
   - The experiment record is deleted
   - All ephemeral agents are removed
   - All ephemeral documents are removed
   - All associated evaluations are cleaned up
   - All related jobs are cancelled or removed

### Manual Cleanup

You can delete an experiment before expiration:
- Use the trash icon on the experiments list
- Confirms deletion of ephemeral resources
- Cannot delete while jobs are still running

## Best Practices

### Naming Conventions

- Use descriptive tracking IDs: `grading-rubric-test-v3`
- Include version numbers for iterations: `prompt-optimization-v1`, `v2`, etc.
- Keep names concise but meaningful

### Experiment Duration

- **1-3 days**: Quick tests and prototypes
- **7 days**: Standard evaluation cycles
- **14-30 days**: Long-term comparison studies

### Resource Management

- Reuse existing documents when possible to avoid duplication
- Create ephemeral agents for any experimental changes
- Monitor active experiments to avoid hitting limits

## API Reference

### Create Experiment

```
POST /api/batches
```

Required fields:
- `isEphemeral: true`
- `expiresInDays: number` (1-30)

Optional fields:
- `trackingId: string` - Human-friendly identifier
- `name: string` - Display name
- `description: string` - Experiment details
- `ephemeralAgent: object` - Agent configuration
- `documentIds: string[]` - Existing documents to evaluate
- `ephemeralDocuments: object` - New documents to create

### Get Experiment Details

```
GET /api/experiments/{trackingId}
```

Returns:
- Experiment metadata
- Job statistics
- Aggregate metrics
- Evaluation results
- Ephemeral resource lists

### Delete Experiment

```
DELETE /api/experiments/{trackingId}
```

Requirements:
- User must own the experiment
- No jobs can be currently running

## Limitations

- Maximum 30-day expiration period
- Cannot modify expiration after creation
- Ephemeral resources cannot be converted to permanent
- Deleted experiments cannot be recovered

## Troubleshooting

### Experiment Not Deleting

**Issue**: Cleanup job hasn't run yet
**Solution**: Wait for the next cleanup cycle or manually delete

### Resources Still Visible

**Issue**: UI cache not updated
**Solution**: Refresh the page to see current state

### Jobs Stuck

**Issue**: Jobs in RUNNING state blocking deletion
**Solution**: Wait for job timeout or contact support

## Examples

### A/B Testing Agent Prompts

```javascript
// Create two experiments with different prompts
const experimentA = await createExperiment({
  trackingId: "prompt-test-a",
  ephemeralAgent: {
    name: "Friendly Reviewer",
    primaryInstructions: "Be encouraging and focus on strengths..."
  },
  documentIds: testDocumentIds
});

const experimentB = await createExperiment({
  trackingId: "prompt-test-b", 
  ephemeralAgent: {
    name: "Critical Reviewer",
    primaryInstructions: "Focus on areas for improvement..."
  },
  documentIds: testDocumentIds
});

// Compare results after completion
```

### Testing Grading Consistency

Create an experiment with the same document evaluated multiple times to check consistency:

```javascript
const experiment = await createExperiment({
  trackingId: "consistency-test",
  ephemeralAgent: { ... },
  documentIds: [docId, docId, docId] // Same doc 3 times
});
```

### Iterative Improvement

Use experiments to refine agent behavior:

1. Create initial experiment with base configuration
2. Review results and identify issues
3. Create new experiment with adjusted prompts
4. Compare metrics between iterations
5. Promote successful configuration to permanent agent