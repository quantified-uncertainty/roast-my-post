"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { CopyMarkdownButton } from "@/components/CopyMarkdownButton";

const apiDocumentation = `# API Documentation

Roast My Post has a simple RESTful API for programmatic access to document evaluation features.

**Note: This API is primarily for the RoastMyPost website. We don't recommend relying on it for production use. Contact us if you want to use it.**

## Authentication

Most API requests require authentication using an API key in the Authorization header:

\`\`\`bash
Authorization: Bearer YOUR_API_KEY
\`\`\`

### Obtaining an API Key

1. Sign in to your account
2. Navigate to Settings → API Keys  
3. Click "Create New API Key"
4. **Important**: Copy your key immediately - it won't be shown again

### API Key Format
- Keys start with \`rmp_\` prefix
- Keys are hashed using SHA-256 before storage
- Optional expiration dates can be set
- Last usage is tracked (updated max once per hour)

## Base URL

\`\`\`
https://roastmypost.com/api
\`\`\`

For local development:
\`\`\`
http://localhost:3000/api
\`\`\`

## API Version

Current version: **v1** (no version prefix in URLs)

The API is under active development. Breaking changes will be announced via GitHub releases.

## Rate Limiting

Currently, there are no enforced rate limits on the API. However, please use the API responsibly to avoid overloading the service. Rate limits may be added in the future.

## Available Endpoints

### Health Check

#### Check API Status
\`\`\`http
GET /health
\`\`\`

No authentication required. Returns:
\`\`\`json
{
  "status": "ok"
}
\`\`\`

### Authentication

API keys are validated automatically on each authenticated request. There is no separate validation endpoint.

### User Management

#### Update User Profile
\`\`\`http
PATCH /user/profile
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "name": "New Name"
}
\`\`\`

**Note**: Requires session authentication (not API key).

#### List API Keys
\`\`\`http
GET /user/api-keys
Authorization: Bearer YOUR_API_KEY
\`\`\`

**Note**: Requires session authentication.

#### Create New API Key
\`\`\`http
POST /user/api-keys
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "name": "My Integration",
  "expiresAt": "2024-12-31T23:59:59Z" // optional
}
\`\`\`

**Note**: Requires session authentication. The response includes the unhashed key only on creation.

#### Delete API Key
\`\`\`http
DELETE /user/api-keys/{keyId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

**Note**: Requires session authentication.

### Documents

#### Get Document by ID or Slug
\`\`\`http
GET /documents/{slugOrId}
\`\`\`

**Note**: This endpoint is public and doesn't require authentication.

#### Update Document
\`\`\`http
PUT /documents/{slugOrId}
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content...",
  "intendedAgentIds": ["agent_123", "agent_456"] // optional
}
\`\`\`

#### Delete Document
\`\`\`http
DELETE /documents/{slugOrId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

Deletes a document. User must be the document owner.

#### Update Document Privacy
\`\`\`http
PATCH /documents/{slugOrId}/privacy
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "isPrivate": true
}
\`\`\`

#### Export Document
\`\`\`http
GET /documents/{slugOrId}/export?format=json
Authorization: Bearer YOUR_API_KEY
\`\`\`

Query parameters:
- \`format\`: Export format (json, markdown, html) - default: json

Exports document with all evaluations in specified format.

#### Search Documents
\`\`\`http
GET /documents/search?q=keyword&limit=20&offset=0&searchContent=false
Authorization: Bearer YOUR_API_KEY
\`\`\`

Query parameters:
- \`q\`: Search query (required)
- \`limit\`: Maximum results (default: 50, max: 100)
- \`offset\`: Pagination offset (default: 0)
- \`searchContent\`: Search in document content too (default: false)

Returns paginated results with total count for building pagination UI.

#### Import Document from URL
\`\`\`http
POST /import
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "url": "https://example.com/article",
  "agentIds": ["agent_123", "agent_456"] // optional
}
\`\`\`

Response:
\`\`\`json
{
  "success": true,
  "documentId": "doc_xyz",
  "document": { /* document details */ },
  "evaluations": [
    {
      "agentId": "agent_123",
      "evaluationId": "eval_abc",
      "jobId": "job_123",
      "status": "pending"
    }
  ]
}
\`\`\`

Supports importing from:
- LessWrong
- EA Forum
- General web pages (via content extraction)

### Evaluators

#### List Evaluators
\`\`\`http
GET /evaluators
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns all evaluators accessible to the user.

#### Get Evaluator Details
\`\`\`http
GET /evaluators/{agentId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Create/Update Evaluator
\`\`\`http
PUT /evaluators
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "id": "agent_123", // optional, creates new if not provided
  "name": "Technical Reviewer",
  "purpose": "ASSESSOR", // ASSESSOR | ADVISOR | ENRICHER | EXPLAINER
  "description": "Reviews technical documentation",
  "primaryInstructions": "Detailed instructions...",
  "providesGrades": true
}
\`\`\`

**Note**: This creates a new evaluator or updates an existing one (creating a new version).

#### Test Evaluator
\`\`\`http
GET /evaluators/{agentId}/review?content=Sample%20text%20to%20test
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns a preview evaluation without saving it. Pass content as URL parameter.

#### Export Evaluator Data
\`\`\`http
GET /evaluators/{agentId}/export-data
Authorization: Bearer YOUR_API_KEY
\`\`\`

Exports evaluator configuration and all evaluations.

#### Get Evaluator Jobs
\`\`\`http
GET /evaluators/{agentId}/jobs?batchId=batch_123
Authorization: Bearer YOUR_API_KEY
\`\`\`

Query parameters:
- \`batchId\`: Filter by specific batch (optional)

#### Get Evaluator Documents
\`\`\`http
GET /evaluators/{agentId}/documents
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns documents evaluated by this evaluator.

#### Get Evaluator Evaluations
\`\`\`http
GET /evaluators/{agentId}/evaluations
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Get Evaluator Batches
\`\`\`http
GET /evaluators/{agentId}/batches
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns recent evaluation batches for this evaluator with statistics:
- Progress and completion status
- Cost and duration metrics
- Average grades
- Job counts by status

#### Get Evaluator Overview Statistics
\`\`\`http
GET /evaluators/{agentId}/overview
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns comprehensive statistics including:
- Total evaluations and unique documents
- Average grade, cost, and processing time
- Success rate and active jobs count
- Recent evaluations

### Evaluations

#### Get Document Evaluations
\`\`\`http
GET /documents/{slugOrId}/evaluations?status=completed&agentId=agent_123&limit=20&offset=0
Authorization: Bearer YOUR_API_KEY
\`\`\`

Query parameters:
- \`status\`: Filter by status (pending, completed, failed) - optional
- \`agentId\`: Filter by specific evaluator - optional
- \`limit\`: Max results (default: 20, max: 100)
- \`offset\`: Pagination offset (default: 0)

#### Create Evaluation for Document
\`\`\`http
POST /documents/{slugOrId}/evaluations
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "agentId": "agent_123"
}
\`\`\`

Returns:
\`\`\`json
{
  "evaluationId": "eval_xyz",
  "jobId": "job_xyz789",
  "status": "pending",
  "created": true
}
\`\`\`

#### Create Multiple Evaluations (Batch)
\`\`\`http
POST /documents/{slugOrId}/evaluations
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "agentIds": ["agent_123", "agent_456"]
}
\`\`\`

Returns:
\`\`\`json
{
  "evaluations": [
    {
      "agentId": "agent_123",
      "evaluationId": "eval_abc",
      "jobId": "job_123",
      "status": "pending",
      "created": true
    },
    {
      "agentId": "agent_456",
      "evaluationId": "eval_def",
      "jobId": "job_456",
      "status": "pending",
      "created": false
    }
  ],
  "total": 2
}
\`\`\`

### Batch Operations

#### Create Evaluation Batch for Existing Documents
\`\`\`http
POST /evaluators/{agentId}/eval-batch
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "targetCount": 10 // Number of random documents to re-evaluate
}
\`\`\`

Or specify exact documents:
\`\`\`http
POST /evaluators/{agentId}/eval-batch
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "documentIds": ["doc_123", "doc_456"],
  "name": "My Batch" // optional
}
\`\`\`

Creates evaluation jobs for documents that already have evaluations by this evaluator.

### Jobs

#### Check Job Status
\`\`\`http
GET /jobs/{jobId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

Response includes status and results when complete:
\`\`\`json
{
  "id": "job_xyz789",
  "status": "completed", // pending | running | completed | failed
  "createdAt": "2024-01-01T00:00:00Z",
  "completedAt": "2024-01-01T00:01:00Z",
  "evaluationId": "eval_abc123"
}
\`\`\`

### Ephemeral Experiments

Create temporary experiments that automatically clean up after expiration. Perfect for testing evaluator configurations and evaluating content without permanent storage.

#### Create Ephemeral Experiment
\`\`\`http
POST /batches
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "isEphemeral": true,
  "trackingId": "exp_custom_name", // Optional, auto-generated if not provided
  "description": "Testing new review criteria",
  "expiresInDays": 1, // Default: 1, max: 90 days

  // Option A: Use existing evaluator
  "agentId": "agent_123",

  // Option B: Create ephemeral evaluator
  "ephemeralAgent": {
    "name": "Test Reviewer",
    "primaryInstructions": "Review instructions...",
    "selfCritiqueInstructions": "Optional self-critique...",
    "providesGrades": true,
    "description": "Optional description"
  },

  // For documents, choose one:
  "documentIds": ["doc_123"], // Existing docs
  "targetCount": 5,           // Random selection from existing docs
  "ephemeralDocuments": {     // New temporary docs
    "inline": [{
      "title": "Test Doc",
      "content": "Content...",
      "author": "John Doe" // Note: singular 'author'
    }]
  }
}
\`\`\`

Response:
\`\`\`json
{
  "batch": {
    "id": "batch_abc123",
    "trackingId": "exp_7a8b9c",
    "trackingUrl": "/experiments/exp_7a8b9c",
    "isEphemeral": true,
    "expiresAt": "2024-01-02T00:00:00Z",
    "jobCount": 2
  },
  "agent": {
    "id": "exp_agent_def456",
    "isEphemeral": true
  }
}
\`\`\`

#### Get Experiment Details
\`\`\`http
GET /experiments/{trackingId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

Response includes:
- Experiment metadata and status
- Agent configuration (if ephemeral)
- Job statistics and progress
- Aggregate metrics (grades, costs, timing)
- Individual results for each document
- Actions available (rerun, extend, promote)

#### Delete Experiment
\`\`\`http
DELETE /experiments/{trackingId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

Deletes an ephemeral experiment and all associated ephemeral resources (agent, documents, evaluations). Cannot delete experiments with running jobs.

#### List Experiments
\`\`\`http
GET /batches?type=experiment
Authorization: Bearer YOUR_API_KEY
\`\`\`

Query parameters:
- \`type\`: "experiment" | "regular" | null (all)
- \`includeExpired\`: Include expired experiments (default: false)
- \`limit\`: Max results (default: 20, max: 100)
- \`offset\`: Pagination offset

Returns batches with job statistics and ephemeral resource counts.

### Admin Endpoints (Requires Admin Role)

These endpoints require both authentication and admin privileges:

#### System Statistics
\`\`\`http
GET /monitor/stats
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Recent Evaluations
\`\`\`http
GET /monitor/evaluations
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Job Queue Status
\`\`\`http
GET /monitor/jobs
Authorization: Bearer YOUR_API_KEY
\`\`\`

## Error Responses

All errors follow a consistent format:

\`\`\`json
{
  "error": "Error message describing what went wrong"
}
\`\`\`

### HTTP Status Codes

- \`200\`: Success
- \`201\`: Created
- \`400\`: Bad Request (invalid parameters)
- \`401\`: Unauthorized (missing/invalid API key)
- \`403\`: Forbidden (insufficient permissions)
- \`404\`: Not Found
- \`429\`: Too Many Requests (if rate limiting is enabled)
- \`500\`: Internal Server Error

## Common Response Patterns

### Pagination
Endpoints that return lists typically support pagination:
\`\`\`json
{
  "items": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
\`\`\`

### Job Status
Job statuses follow this lifecycle:
- \`pending\`: Job queued, not started
- \`running\`: Job in progress
- \`completed\`: Job finished successfully
- \`failed\`: Job encountered an error

### Numeric Values
- Costs are in **cents** (e.g., 1250 = $12.50)
- Grades are 0-100 scale
- Durations are in seconds

## Code Examples

### Python
\`\`\`python
import requests
import time

API_KEY = "rmp_sk_live_..."
BASE_URL = "https://roastmypost.com/api"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Import a document
import_response = requests.post(
    f"{BASE_URL}/import",
    headers=headers,
    json={
        "url": "https://example.com/article",
        "agentIds": ["agent_123"]
    }
)
import_data = import_response.json()
doc_id = import_data["documentId"]

# Check if evaluations were created
if import_data.get("evaluations"):
    job_id = import_data["evaluations"][0]["jobId"]

    # Poll job status
    while True:
        job_response = requests.get(
            f"{BASE_URL}/jobs/{job_id}",
            headers=headers
        )
        job = job_response.json()

        if job["status"] in ["completed", "failed"]:
            break

        time.sleep(5)

    if job["status"] == "completed":
        print(f"Evaluation complete! ID: {job.get('evaluationId')}")
\`\`\`

### JavaScript/TypeScript
\`\`\`typescript
const API_KEY = 'rmp_sk_live_...';
const BASE_URL = 'https://roastmypost.com/api';

const headers = {
  'Authorization': \`Bearer \${API_KEY}\`,
  'Content-Type': 'application/json'
};

// Import and evaluate
async function importAndEvaluate(url: string, agentId: string) {
  // Import document
  const importRes = await fetch(\`\${BASE_URL}/import\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      url,
      agentIds: [agentId]
    })
  });

  const importData = await importRes.json();
  const docId = importData.documentId;

  // If evaluations were created, poll for completion
  if (importData.evaluations && importData.evaluations.length > 0) {
    const jobId = importData.evaluations[0].jobId;

    let job;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const jobRes = await fetch(\`\${BASE_URL}/jobs/\${jobId}\`, { headers });
      job = await jobRes.json();
    } while (job.status === 'pending' || job.status === 'running');

    return job;
  }

  return importData;
}

// Create an ephemeral experiment
async function runExperiment() {
  const response = await fetch(\`\${BASE_URL}/batches\`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      isEphemeral: true,
      description: 'Testing new review criteria',
      ephemeralAgent: {
        name: 'Strict Reviewer',
        primaryInstructions: 'Apply high standards...',
        providesGrades: true
      },
      ephemeralDocuments: {
        inline: [{
          title: 'Test Content',
          content: 'Sample text to review...'
        }]
      }
    })
  });
  
  const result = await response.json();
  const trackingId = result.batch.trackingId;
  
  // Get experiment results
  const details = await fetch(
    \`\${BASE_URL}/experiments/\${trackingId}\`,
    { headers }
  );
  
  return details.json();
}
\`\`\`

## Notes & Limitations

- Some user management endpoints require session authentication (not API key)
- Evaluator creation/update uses PUT method, not POST
- No PATCH or DELETE methods for evaluators (only versioning via PUT)
- Two batch endpoints: \`/evaluators/{id}/eval-batch\` for re-evaluations, \`/batches\` for experiments
- No webhook support (poll job status instead)
- Rate limiting not currently enforced
- No official SDK libraries yet (use HTTP directly)
- Costs are returned in cents (multiply dollars by 100)

## Support

- **Issues**: [GitHub](https://github.com/quantified-uncertainty/roast-my-post/issues)
- **Discord**: [Join our community](https://discord.gg/nsTnQTgtG6)
- **Email**: api-support@quantifieduncertainty.org`;

export default function APIDocumentationPage() {
  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
        <CopyMarkdownButton content={apiDocumentation} />
      </div>

      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {apiDocumentation}
        </ReactMarkdown>
      </div>
    </div>
  );
}
