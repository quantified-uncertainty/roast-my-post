"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClipboardDocumentIcon, CheckIcon } from "@heroicons/react/24/outline";

const apiDocumentation = `# API Documentation

Roast My Post provides a RESTful API for programmatic access to document evaluation features.

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

## Rate Limiting

API requests are rate limited to prevent abuse:

- **Standard endpoints**: 60 requests per minute
- **Sensitive endpoints**: 10 requests per minute  
- **Import endpoints**: 20 requests per hour

Rate limits are enforced per IP address. When you exceed the rate limit, you'll receive a 429 response.

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

#### Validate API Key
\`\`\`http
GET /validate-key
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns user information if the API key is valid.

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

### Users

#### List All Users
\`\`\`http
GET /users
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns all users. If authenticated, includes \`isCurrentUser\` flag.

#### Get User Details
\`\`\`http
GET /users/{userId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Get User's Agent Count
\`\`\`http
GET /users/{userId}/agents/count
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Get User's Document Count
\`\`\`http
GET /users/{userId}/documents/count
Authorization: Bearer YOUR_API_KEY
\`\`\`

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
  "content": "Updated content..."
}
\`\`\`

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

Supports importing from:
- LessWrong
- EA Forum
- General web pages (via content extraction)

### Agents

#### List Agents
\`\`\`http
GET /agents
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns all agents accessible to the user.

#### Get Agent Details
\`\`\`http
GET /agents/{agentId}
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Create/Update Agent
\`\`\`http
PUT /agents
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

**Note**: This creates a new agent or updates an existing one (creating a new version).

#### Test Agent
\`\`\`http
GET /agents/{agentId}/review?content=Sample%20text%20to%20test
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns a preview evaluation without saving it. Pass content as URL parameter.

#### Export Agent Data
\`\`\`http
GET /agents/{agentId}/export-data
Authorization: Bearer YOUR_API_KEY
\`\`\`

Exports agent configuration and all evaluations.

#### Get Agent Jobs
\`\`\`http
GET /agents/{agentId}/jobs?batchId=batch_123
Authorization: Bearer YOUR_API_KEY
\`\`\`

Query parameters:
- \`batchId\`: Filter by specific batch (optional)

#### Get Agent Documents
\`\`\`http
GET /agents/{agentId}/documents
Authorization: Bearer YOUR_API_KEY
\`\`\`

Returns documents evaluated by this agent.

#### Get Agent Evaluations
\`\`\`http
GET /agents/{agentId}/evaluations
Authorization: Bearer YOUR_API_KEY
\`\`\`

### Evaluations

#### Get Document Evaluations
\`\`\`http
GET /documents/{slugOrId}/evaluations
Authorization: Bearer YOUR_API_KEY
\`\`\`

#### Create Evaluation for Document
\`\`\`http
POST /documents/{slugOrId}/evaluations
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "agentId": "agent_123"
}
\`\`\`

Returns a job ID to track progress:
\`\`\`json
{
  "jobId": "job_xyz789",
  "status": "pending"
}
\`\`\`

### Batch Operations

#### Create Evaluation Batch
\`\`\`http
POST /agents/{agentId}/eval-batch
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "targetCount": 10 // Number of documents to evaluate
}
\`\`\`

Creates multiple evaluation jobs for randomly selected documents.

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
- \`500\`: Internal Server Error

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
doc_id = import_data["document"]["id"]
job_id = import_data["jobs"][0]["id"] if import_data.get("jobs") else None

# Check job status if evaluation was created
if job_id:
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
        print(f"Evaluation complete! ID: {job['evaluationId']}")
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
  const docId = importData.document.id;
  
  // If jobs were created, poll for completion
  if (importData.jobs && importData.jobs.length > 0) {
    const jobId = importData.jobs[0].id;
    
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
\`\`\`

## Notes & Limitations

- Some user management endpoints require session authentication (not API key)
- Agent creation/update uses PUT method, not POST
- No PATCH or DELETE methods for agents
- Batch endpoint is \`/eval-batch\`, not \`/batches\`
- No webhook support (poll job status instead)
- Rate limit headers not included in responses
- No SDK libraries yet (use HTTP directly)

## Support

- **Issues**: [GitHub](https://github.com/quantified-uncertainty/roast-my-post/issues)
- **Discord**: [Join our community](https://discord.gg/nsTmQqHRnV)
- **Email**: api-support@quantifieduncertainty.org`;

export default function APIDocumentationPage() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiDocumentation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          API Documentation
        </h1>
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center rounded-md bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          {copied ? (
            <>
              <CheckIcon className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="mr-2 h-4 w-4" />
              Copy as MD
            </>
          )}
        </button>
      </div>
      
      <div className="prose prose-gray max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{apiDocumentation}</ReactMarkdown>
      </div>
    </div>
  );
}