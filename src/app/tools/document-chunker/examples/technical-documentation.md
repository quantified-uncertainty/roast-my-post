# REST API Documentation

## Overview

The Quantum Analytics API provides programmatic access to our advanced data processing and machine learning capabilities. This RESTful API enables developers to integrate quantum-enhanced analytics into their applications, supporting real-time data processing, predictive modeling, and complex statistical analysis.

Our API follows industry-standard REST principles, uses JSON for data exchange, and implements OAuth 2.0 for secure authentication. Rate limiting is enforced to ensure fair usage across all clients.

## Authentication

### OAuth 2.0 Setup

Before making any API requests, you must obtain an access token through our OAuth 2.0 implementation. The authentication flow follows the client credentials grant type for server-to-server communication.

```bash
curl -X POST https://api.quantumanalytics.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "scope=analytics:read analytics:write"
```

The response will include an access token valid for 3600 seconds:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "analytics:read analytics:write"
}
```

## Data Processing Endpoints

### Upload Dataset

The `/datasets` endpoint allows you to upload structured data for analysis. Supported formats include CSV, JSON, and Parquet files up to 100MB in size.

```python
import requests

url = "https://api.quantumanalytics.com/v1/datasets"
headers = {
    "Authorization": "Bearer YOUR_ACCESS_TOKEN",
    "Content-Type": "multipart/form-data"
}

with open("data.csv", "rb") as file:
    files = {"file": file}
    data = {
        "name": "Sales Data Q1 2024",
        "description": "Quarterly sales performance data",
        "tags": ["sales", "revenue", "quarterly"]
    }
    response = requests.post(url, headers=headers, files=files, data=data)
```

### Run Analysis

Once your dataset is uploaded, you can execute various analytical operations:

```javascript
const response = await fetch('https://api.quantumanalytics.com/v1/analysis', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dataset_id: "ds_abc123",
    analysis_type: "predictive_modeling",
    parameters: {
      target_variable: "revenue",
      model_type: "quantum_regression",
      validation_split: 0.2
    }
  })
});
```

## Error Handling

The API uses conventional HTTP response codes to indicate success or failure. Errors include detailed JSON responses with error codes and human-readable messages for debugging purposes.