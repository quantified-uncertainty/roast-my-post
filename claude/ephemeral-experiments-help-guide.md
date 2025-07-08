# Ephemeral Experiments Help Guide

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

### Creating Your First Experiment

1. **From the Web Interface**:
   - Navigate to "Experiments" → "New Experiment"
   - Toggle "Ephemeral" mode
   - Configure your agent and documents
   - Click "Run Experiment"

2. **Using the API**:
   ```bash
   curl -X POST https://roastmypost.com/api/batches \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "isEphemeral": true,
       "description": "My first experiment",
       "ephemeralAgent": {
         "name": "Test Reviewer",
         "primaryInstructions": "Review for clarity and completeness."
       },
       "documentIds": ["doc_123"]
     }'
   ```

### Understanding Experiment Types

#### 1. **Test Existing Agent**
Use your production agent on test content:
```json
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
```

#### 2. **Test New Agent Configuration**
Create a temporary agent with custom instructions:
```json
{
  "isEphemeral": true,
  "ephemeralAgent": {
    "name": "Experimental Reviewer",
    "primaryInstructions": "New review approach...",
    "providesGrades": true
  },
  "documentIds": ["doc_123", "doc_456"]
}
```

#### 3. **Full Sandbox Mode**
Everything ephemeral - agent and documents:
```json
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
```

## Viewing Results

### During the Experiment
Access your results at: `https://roastmypost.com/experiments/[trackingId]`

The results page shows:
- **Overview**: Description, expiration time, status
- **Agent Details**: Configuration used for the experiment
- **Job Statistics**: Progress and success rates
- **Aggregate Metrics**: Average grades, total cost, completion time
- **Individual Results**: Detailed evaluation for each document

### Tracking IDs
Each experiment gets a unique tracking ID (e.g., `exp_7a8b9c`). Use this to:
- Share results with teammates (they'll need access)
- Reference in API calls
- Track multiple experiments

## Best Practices

### 1. **Name Your Experiments**
Use descriptive names and descriptions:
```json
{
  "trackingId": "exp_strict_criteria_v2",
  "description": "Testing stricter grading criteria for technical docs"
}
```

### 2. **Set Appropriate Expiration**
- Quick tests: 1-6 hours
- Day-long experiments: 24 hours
- Week-long studies: up to 7 days

### 3. **Use Representative Content**
Test with content similar to your actual use case for meaningful results.

### 4. **Compare Side-by-Side**
Run multiple experiments with the same documents but different agents:
```python
agents = ["lenient", "balanced", "strict"]
for agent_type in agents:
    create_experiment(
        agent_config=configs[agent_type],
        documents=same_test_docs,
        tracking_id=f"exp_compare_{agent_type}"
    )
```

## Common Use Cases

### 1. **A/B Testing Agent Instructions**

**Scenario**: You want to see if more detailed instructions improve evaluation quality.

**Approach**:
1. Create Experiment A with current instructions
2. Create Experiment B with detailed instructions
3. Use the same test documents for both
4. Compare average grades and feedback quality

### 2. **Testing on Edge Cases**

**Scenario**: Ensure your agent handles unusual content appropriately.

**Approach**:
```json
{
  "agentId": "agent_production",
  "isEphemeral": true,
  "description": "Edge case testing",
  "ephemeralDocuments": {
    "inline": [
      { "title": "Empty Document", "content": "" },
      { "title": "Very Long Document", "content": "..." },
      { "title": "Code Heavy", "content": "..." },
      { "title": "Non-English", "content": "..." }
    ]
  }
}
```

### 3. **Training New Team Members**

**Scenario**: Help new team members understand how agents work.

**Approach**:
- Create experiments with different agent personalities
- Show how instructions affect evaluation outcomes
- Safe environment to experiment without affecting production

## Limitations

1. **No URL Import**: Currently, you cannot import documents from URLs for ephemeral experiments
2. **Access Control**: Experiments are private to the creator
3. **Rate Limits**: Maximum 10 experiments per hour
4. **Size Limits**: Maximum 100 documents per experiment
5. **Expiration**: Maximum 7 days (168 hours)

## Cleanup Process

### Automatic Cleanup
When an experiment expires:
1. The batch record is deleted
2. Ephemeral agents are removed (if created for the experiment)
3. Ephemeral documents are deleted (if created for the experiment)
4. All evaluations and jobs are removed
5. Regular (non-ephemeral) resources are preserved

### Manual Cleanup
Currently, experiments cannot be manually deleted before expiration. Plan your expiration times accordingly.

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
- Refresh the page or check job status
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

**Q: Can I use experiments in production?**
A: Experiments are designed for testing. Use regular agents and evaluations for production workloads.

## API Integration

For programmatic access, see the [API Documentation](/help/api#ephemeral-experiments) for:
- Creating experiments via API
- Retrieving results programmatically  
- Batch experiment creation
- Status monitoring

## Getting Help

- **Documentation**: [Full API Docs](/help/api)
- **Support**: [Discord Community](https://discord.gg/nsTnQTgtG6)
- **Issues**: [GitHub](https://github.com/quantified-uncertainty/roast-my-post/issues)
- **Email**: support@quantifieduncertainty.org