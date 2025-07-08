# Ephemeral Experiments API Documentation

## Overview

The ephemeral experiments feature allows users to create temporary evaluation experiments with automatic cleanup. This is perfect for:
- Testing new agent configurations
- Running quick experiments without cluttering your workspace
- Evaluating content without permanent storage
- Comparing different agent approaches

## New API Endpoints

### 1. Create Ephemeral Experiment

```http
POST /api/batches
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

#### Request Body

```json
{
  "agentId": "agent_123",  // Existing agent ID (optional if creating ephemeral agent)
  "isEphemeral": true,
  "trackingId": "exp_custom_name",  // Optional, auto-generated if not provided
  "description": "Testing new review criteria",
  "expirationHours": 24,  // Default: 24 hours
  
  // Option 1: Use existing documents
  "documentIds": ["doc_123", "doc_456"],
  
  // Option 2: Create ephemeral documents
  "ephemeralDocuments": {
    "inline": [
      {
        "title": "Test Document",
        "content": "Document content here...",
        "contentType": "text/plain",
        "authors": ["John Doe"]
      }
    ]
  },
  
  // Option 3: Create ephemeral agent
  "ephemeralAgent": {
    "name": "Experimental Reviewer",
    "primaryInstructions": "Review for clarity and technical accuracy...",
    "selfCritiqueInstructions": "Consider if your review is constructive...",
    "providesGrades": true,
    "description": "Agent for testing new review approach"
  }
}
```

#### Response

```json
{
  "batch": {
    "id": "batch_abc123",
    "trackingId": "exp_7a8b9c",
    "isEphemeral": true,
    "expiresAt": "2024-01-02T00:00:00Z",
    "description": "Testing new review criteria",
    "jobCount": 2
  },
  "agent": {
    "id": "exp_agent_def456",
    "name": "Experimental Reviewer",
    "isEphemeral": true
  },
  "jobs": [
    {
      "id": "job_xyz789",
      "status": "pending"
    }
  ]
}
```

### 2. Get Experiment Details

```http
GET /api/experiments/{trackingId}
Authorization: Bearer YOUR_API_KEY
```

Query Parameters:
- `includeResults`: Include evaluation results (default: false)

#### Response

```json
{
  "id": "batch_abc123",
  "trackingId": "exp_7a8b9c",
  "description": "Testing new review criteria",
  "isEphemeral": true,
  "expiresAt": "2024-01-02T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z",
  
  "agent": {
    "id": "exp_agent_def456",
    "name": "Experimental Reviewer",
    "isEphemeral": true,
    "config": {
      "primaryInstructions": "Review for clarity...",
      "selfCritiqueInstructions": "Consider if...",
      "providesGrades": true
    }
  },
  
  "jobStats": {
    "total": 2,
    "completed": 1,
    "failed": 0,
    "running": 1,
    "pending": 0
  },
  
  "aggregateMetrics": {
    "averageGrade": 85.5,
    "totalCost": 1250,  // in cents
    "totalTime": 45,    // in seconds
    "successRate": 100
  },
  
  "results": [
    {
      "jobId": "job_xyz789",
      "documentId": "doc_123",
      "documentTitle": "Test Document",
      "status": "completed",
      "grade": 85.5,
      "summary": "Well-written but could improve...",
      "costInCents": 625,
      "durationInSeconds": 23
    }
  ],
  
  "ephemeralDocuments": [
    {
      "id": "exp_doc_ghi789",
      "title": "Test Document"
    }
  ]
}
```

### 3. List Experiments

```http
GET /api/batches?type=experiment
Authorization: Bearer YOUR_API_KEY
```

Query Parameters:
- `type`: Filter by batch type ("experiment", "regular", or null for all)
- `includeExpired`: Include expired experiments (default: false)
- `limit`: Maximum results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)

#### Response

```json
{
  "batches": [
    {
      "id": "batch_abc123",
      "trackingId": "exp_7a8b9c",
      "description": "Testing new review criteria",
      "isEphemeral": true,
      "expiresAt": "2024-01-02T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "agent": {
        "id": "exp_agent_def456",
        "name": "Experimental Reviewer",
        "isEphemeral": true
      },
      "ephemeralDocumentCount": 2,
      "jobStats": {
        "total": 2,
        "completed": 1,
        "failed": 0,
        "running": 1,
        "pending": 0
      }
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

## Usage Examples

### 1. Quick Agent Test

Test a new agent configuration on sample content:

```python
import requests

API_KEY = "rmp_sk_live_..."
BASE_URL = "https://roastmypost.com/api"

# Create experiment with ephemeral agent and document
response = requests.post(
    f"{BASE_URL}/batches",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "isEphemeral": True,
        "description": "Testing stricter review criteria",
        "ephemeralAgent": {
            "name": "Strict Technical Reviewer",
            "primaryInstructions": "Review with very high standards...",
            "providesGrades": True
        },
        "ephemeralDocuments": {
            "inline": [{
                "title": "Sample Code Review",
                "content": "function add(a, b) { return a + b; }",
                "contentType": "text/plain"
            }]
        }
    }
)

experiment = response.json()
print(f"Experiment created: {experiment['batch']['trackingId']}")
```

### 2. Compare Agent Versions

Test existing agent on new documents:

```typescript
// Create experiment with existing agent
const experiment = await fetch(`${BASE_URL}/batches`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    agentId: 'agent_production_v1',
    isEphemeral: true,
    trackingId: 'exp_new_criteria_test',
    description: 'Testing agent on edge cases',
    ephemeralDocuments: {
      inline: [
        {
          title: 'Edge Case 1',
          content: 'Complex technical content...'
        },
        {
          title: 'Edge Case 2', 
          content: 'Ambiguous requirements...'
        }
      ]
    }
  })
});

// Check results after completion
const results = await fetch(
  `${BASE_URL}/experiments/${trackingId}?includeResults=true`,
  { headers }
);
```

### 3. Batch Testing

Run multiple experiments programmatically:

```python
# Test different agent configurations
configurations = [
    {
        "name": "Lenient Reviewer",
        "primaryInstructions": "Be constructive and encouraging..."
    },
    {
        "name": "Strict Reviewer",
        "primaryInstructions": "Apply rigorous standards..."
    },
    {
        "name": "Balanced Reviewer",
        "primaryInstructions": "Balance criticism with encouragement..."
    }
]

experiments = []
for config in configurations:
    response = requests.post(
        f"{BASE_URL}/batches",
        headers=headers,
        json={
            "isEphemeral": True,
            "ephemeralAgent": config,
            "documentIds": ["doc_123", "doc_456"]  # Same docs for comparison
        }
    )
    experiments.append(response.json())

# Compare results after completion
for exp in experiments:
    tracking_id = exp['batch']['trackingId']
    results = requests.get(
        f"{BASE_URL}/experiments/{tracking_id}",
        headers=headers
    ).json()
    print(f"{results['agent']['name']}: {results['aggregateMetrics']['averageGrade']}")
```

## Important Notes

1. **Automatic Cleanup**: Ephemeral resources are automatically deleted after expiration
2. **Access Control**: Only the creator can view experiment results
3. **Resource Limits**: 
   - Maximum 100 documents per experiment
   - Maximum expiration time: 7 days
   - Rate limit: 10 experiments per hour
4. **No URL Import**: URL import for ephemeral documents is not yet implemented
5. **Cascade Deletion**: When an experiment expires, all associated resources (agent, documents, evaluations) are deleted if they were created as ephemeral

## Error Responses

```json
// 400 Bad Request - Invalid configuration
{
  "error": "Must provide either agentId or ephemeralAgent"
}

// 404 Not Found - Experiment doesn't exist
{
  "error": "Experiment not found"
}

// 403 Forbidden - Not the owner
{
  "error": "Access denied"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "error": "Too many experiments created. Please wait before creating more."
}
```