// Example documents for the document chunker tool

export const technicalDocumentation = `# REST API Documentation

## Overview

The Quantum Analytics API provides programmatic access to our advanced data processing and machine learning capabilities. This RESTful API enables developers to integrate quantum-enhanced analytics into their applications, supporting real-time data processing, predictive modeling, and complex statistical analysis.

Our API follows industry-standard REST principles, uses JSON for data exchange, and implements OAuth 2.0 for secure authentication. Rate limiting is enforced to ensure fair usage across all clients.

## Authentication

### OAuth 2.0 Setup

Before making any API requests, you must obtain an access token through our OAuth 2.0 implementation. The authentication flow follows the client credentials grant type for server-to-server communication.

\`\`\`bash
curl -X POST https://api.quantumanalytics.com/oauth/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET" \\
  -d "scope=analytics:read analytics:write"
\`\`\`

The response will include an access token valid for 3600 seconds:

\`\`\`json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "analytics:read analytics:write"
}
\`\`\`

## Data Processing Endpoints

### Upload Dataset

The \`/datasets\` endpoint allows you to upload structured data for analysis. Supported formats include CSV, JSON, and Parquet files up to 100MB in size.

\`\`\`python
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
\`\`\`

### Run Analysis

Once your dataset is uploaded, you can execute various analytical operations:

\`\`\`javascript
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
\`\`\`

## Error Handling

The API uses conventional HTTP response codes to indicate success or failure. Errors include detailed JSON responses with error codes and human-readable messages for debugging purposes.`;

export const academicPaper = `# The Impact of Machine Learning on Climate Prediction Models

## Abstract

Climate prediction has undergone significant transformation with the integration of machine learning algorithms. This study examines the effectiveness of neural networks, ensemble methods, and deep learning architectures in improving the accuracy of long-term climate forecasts. We analyzed temperature and precipitation data from 1950-2023 across 500 global weather stations, comparing traditional statistical models with modern ML approaches.

Our findings demonstrate that hybrid models combining physics-based simulations with machine learning achieve 23% better accuracy in 10-year climate projections compared to conventional methods alone. These improvements are particularly pronounced in predicting extreme weather events, where ML models show 31% higher precision in identifying potential drought conditions and 28% better performance in forecasting severe precipitation events.

## Introduction

Climate prediction represents one of the most complex challenges in environmental science, requiring the integration of vast amounts of atmospheric, oceanic, and terrestrial data. Traditional climate models rely heavily on physical equations describing atmospheric dynamics, but these approaches often struggle with nonlinear interactions and chaotic behavior inherent in climate systems.

The emergence of machine learning offers new opportunities to enhance predictive capabilities by identifying patterns in historical climate data that may not be captured by conventional physics-based models. Recent advances in computational power and data availability have made it feasible to apply sophisticated ML algorithms to climate prediction problems at unprecedented scales.

## Methodology

### Data Collection and Preprocessing

We compiled a comprehensive dataset spanning 73 years of climate observations from the Global Historical Climatology Network (GHCN). The dataset includes daily temperature readings, precipitation measurements, humidity levels, wind speed, and atmospheric pressure from 500 strategically selected weather stations representing diverse climate zones.

Data preprocessing involved several critical steps: quality control filtering to remove erroneous measurements, gap-filling algorithms for missing values, standardization to account for instrument changes over time, and feature engineering to create derived variables such as temperature trends, seasonal anomalies, and extreme event indicators.

### Model Architecture

We implemented three primary machine learning approaches: Long Short-Term Memory (LSTM) networks for capturing temporal dependencies, Random Forest ensembles for handling feature interactions, and Convolutional Neural Networks (CNNs) for spatial pattern recognition in gridded climate data.

\`\`\`python
import tensorflow as tf
from sklearn.ensemble import RandomForestRegressor

# LSTM model for temporal climate patterns
model = tf.keras.Sequential([
    tf.keras.layers.LSTM(128, return_sequences=True),
    tf.keras.layers.Dropout(0.2),
    tf.keras.layers.LSTM(64),
    tf.keras.layers.Dense(32, activation='relu'),
    tf.keras.layers.Dense(1)
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])
\`\`\`

## Results and Discussion

The hybrid ML-physics models demonstrated substantial improvements over baseline approaches. Temperature predictions showed mean absolute errors of 0.7°C for 5-year forecasts and 1.2°C for 10-year projections, representing improvements of 18% and 23% respectively over traditional methods.

Precipitation forecasting proved more challenging due to its inherently chaotic nature, but ML models still achieved 15% better correlation coefficients with observed rainfall patterns. The models performed exceptionally well in identifying seasonal shifts and long-term precipitation trends associated with climate change.`;

export const tutorialGuide = `# Complete Guide to Building Modern Web Applications with React and TypeScript

## Introduction

Modern web development requires mastery of multiple technologies working in harmony. This comprehensive tutorial will guide you through building a production-ready web application using React 18, TypeScript, and modern development tools. By the end of this guide, you'll have created a fully functional task management application with real-time updates, user authentication, and responsive design.

We'll cover everything from initial project setup to deployment, including best practices for code organization, testing strategies, performance optimization, and security considerations. This tutorial assumes basic familiarity with JavaScript and web development concepts.

## Chapter 1: Project Setup and Environment Configuration

### Setting Up the Development Environment

First, ensure you have Node.js 18 or later installed on your system. We'll use Vite as our build tool for its superior performance and developer experience compared to Create React App.

\`\`\`bash
# Create new project with Vite
npm create vite@latest task-manager -- --template react-ts
cd task-manager
npm install

# Install additional dependencies
npm install @tanstack/react-query axios react-router-dom
npm install -D @types/node vitest @testing-library/react
\`\`\`

### Project Structure Organization

Organize your project using a feature-based architecture that scales well as your application grows:

\`\`\`
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components
│   └── forms/          # Form-specific components
├── features/           # Feature-specific code
│   ├── auth/          # Authentication logic
│   ├── tasks/         # Task management
│   └── dashboard/     # Dashboard functionality
├── hooks/             # Custom React hooks
├── services/          # API calls and external services
├── store/             # State management
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
\`\`\`

## Chapter 2: Building Core Components

### Creating the Task Interface

Define TypeScript interfaces to ensure type safety throughout your application:

\`\`\`typescript
interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TaskFilters {
  status: 'all' | 'completed' | 'pending';
  priority: string[];
  tags: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}
\`\`\`

### Implementing the Task Component

Create a reusable Task component with proper error handling and accessibility features:

\`\`\`tsx
import React, { useState } from 'react';
import { Task } from '../types/Task';

interface TaskProps {
  task: Task;
  onUpdate: (task: Task) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export const TaskItem: React.FC<TaskProps> = ({ task, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleComplete = async () => {
    setLoading(true);
    try {
      await onUpdate({ ...task, completed: !task.completed });
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-item" role="listitem">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={handleToggleComplete}
        disabled={loading}
        aria-label={\`Mark "\${task.title}" as \${task.completed ? 'incomplete' : 'complete'}\`}
      />
      <div className="task-content">
        <h3>{task.title}</h3>
        <p>{task.description}</p>
      </div>
    </div>
  );
};
\`\`\`

## Chapter 3: State Management and API Integration

Implement efficient state management using React Query for server state and Context API for client state. This approach separates concerns and provides excellent caching and synchronization capabilities.`;

export const policyDocument = `# Data Privacy and Security Policy

## 1. Purpose and Scope

This Data Privacy and Security Policy establishes comprehensive guidelines for the collection, processing, storage, and protection of personal and sensitive information within our organization. This policy applies to all employees, contractors, partners, and third-party service providers who handle data on behalf of the company.

The policy ensures compliance with applicable data protection regulations including the General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA), and other relevant privacy laws. It outlines our commitment to protecting individual privacy rights while enabling legitimate business operations.

All data processing activities must align with the principles of data minimization, purpose limitation, accuracy, storage limitation, integrity, confidentiality, and accountability as defined in this policy.

## 2. Data Classification and Handling Requirements

### 2.1 Personal Data Categories

Personal data is classified into the following categories based on sensitivity and risk:

**Category A - Highly Sensitive Data:** Includes financial information, health records, biometric data, social security numbers, and authentication credentials. This data requires the highest level of protection with encryption at rest and in transit, restricted access controls, and mandatory audit logging.

**Category B - Sensitive Personal Data:** Encompasses names, email addresses, phone numbers, demographic information, and usage analytics. Standard encryption and access controls apply, with regular access reviews and data retention policies enforced.

**Category C - Public or Low-Risk Data:** Covers publicly available information and aggregated, anonymized datasets. Basic security measures apply, though data integrity and availability remain important considerations.

### 2.2 Data Processing Principles

All data processing must be lawful, fair, and transparent. Personal data shall be collected for specified, explicit, and legitimate purposes and not further processed in a manner incompatible with those purposes. Data subjects must be informed about processing activities through clear privacy notices.

Data accuracy is maintained through regular validation procedures and prompt correction of inaccuracies. Personal data is kept only for as long as necessary to fulfill the stated purposes, with automatic deletion processes implemented where feasible.

## 3. Technical Security Measures

### 3.1 Encryption Standards

All personal data must be encrypted using industry-standard algorithms:
- Data at rest: AES-256 encryption
- Data in transit: TLS 1.3 or higher
- Database encryption: Transparent Data Encryption (TDE)
- Backup encryption: AES-256 with secure key management

### 3.2 Access Controls and Authentication

Multi-factor authentication is mandatory for all systems processing personal data. Role-based access control (RBAC) ensures users receive minimum necessary permissions. Access rights are reviewed quarterly and immediately revoked upon employment termination.

System administrators require additional approval for privileged access, and all administrative activities are logged and monitored. Regular penetration testing and vulnerability assessments ensure security controls remain effective.

## 4. Data Subject Rights and Procedures

### 4.1 Individual Rights

Data subjects have the right to:
- Be informed about data processing activities
- Access their personal data
- Rectify inaccurate or incomplete data
- Request erasure of personal data
- Restrict processing under certain circumstances
- Data portability in machine-readable formats
- Object to processing based on legitimate interests

### 4.2 Response Procedures

All data subject requests must be acknowledged within 72 hours and resolved within 30 days unless an extension is justified. Free identity verification is required before processing requests. Complex requests may require additional time with appropriate communication to the data subject.

A centralized request tracking system maintains records of all data subject requests, responses, and any appeals or complaints received.

## 5. Breach Response and Incident Management

Data breaches involving personal data must be reported to the Data Protection Officer within 24 hours of discovery. Risk assessment determines notification requirements to supervisory authorities and affected individuals based on likelihood and severity of impact to rights and freedoms.

Incident response procedures include immediate containment, forensic investigation, impact assessment, and implementation of corrective measures to prevent recurrence. Post-incident reviews identify lessons learned and policy improvements.`;

export const researchReport = `# Global E-commerce Market Analysis: Trends and Projections 2024-2030

## Executive Summary

The global e-commerce market has experienced unprecedented growth, reaching $6.2 trillion in 2024, representing a 12.3% increase from the previous year. This comprehensive analysis examines market trends, consumer behavior shifts, technological innovations, and regional variations that are reshaping the digital commerce landscape.

Our research indicates that mobile commerce now accounts for 67% of all online transactions, driven by improved mobile user experiences and the proliferation of mobile payment solutions. Social commerce has emerged as a significant growth driver, with platforms like TikTok Shop and Instagram Shopping generating $1.2 trillion in sales volume.

Key findings suggest that the market will continue expanding at a compound annual growth rate (CAGR) of 14.7% through 2030, reaching an estimated $18.5 trillion globally. However, growth patterns vary significantly across regions, with emerging markets in Southeast Asia and Latin America showing the highest expansion rates.

## Market Size and Growth Dynamics

### Global Market Valuation

The e-commerce sector's rapid expansion reflects fundamental shifts in consumer behavior accelerated by digital transformation initiatives and changing lifestyle preferences. North America and Europe remain the largest markets by revenue, contributing $2.8 trillion and $1.9 trillion respectively in 2024.

Asia-Pacific markets, led by China and India, demonstrate the highest growth velocity. China's e-commerce market alone grew by 18.2% year-over-year, reaching $2.1 trillion in gross merchandise value. The region benefits from large population bases, increasing internet penetration, and innovative payment ecosystems.

Emerging markets present significant opportunities, with countries like Indonesia, Brazil, and Nigeria showing growth rates exceeding 25% annually. Infrastructure improvements, smartphone adoption, and developing logistics networks drive this expansion.

### Segment Analysis

Business-to-consumer (B2C) e-commerce represents the largest segment at $4.8 trillion, followed by business-to-business (B2B) at $1.4 trillion. The B2B segment shows particular promise with digital procurement solutions gaining traction among enterprises seeking operational efficiency.

Cross-border e-commerce reached $785 billion in 2024, facilitated by improved international shipping solutions and simplified customs procedures. Consumers increasingly purchase from international retailers, driven by product variety and competitive pricing.

## Technology Trends Shaping the Future

### Artificial Intelligence and Personalization

AI-powered recommendation engines now influence 73% of purchase decisions on major e-commerce platforms. Machine learning algorithms analyze browsing patterns, purchase history, and demographic data to deliver personalized shopping experiences that increase conversion rates by an average of 19%.

Conversational AI and chatbots handle 62% of customer service inquiries, reducing operational costs while improving response times. Advanced natural language processing enables more sophisticated interactions, helping customers find products and resolve issues efficiently.

Computer vision technology enhances visual search capabilities, allowing customers to search for products using images rather than text. This technology shows particular strength in fashion and home décor categories, where visual appeal significantly influences purchasing decisions.

### Augmented Reality and Virtual Experiences

Augmented reality (AR) adoption in e-commerce increased by 94% in 2024, with beauty, fashion, and furniture retailers leading implementation. AR try-on experiences reduce return rates by up to 35% by helping customers make more informed purchase decisions.

Virtual reality (VR) applications, while still emerging, show promise for high-value purchases such as real estate, automobiles, and luxury goods. Early adopters report increased customer engagement and higher conversion rates for VR-enhanced product presentations.

\`\`\`python
# E-commerce growth calculation model
def calculate_market_projection(current_value, growth_rate, years):
    """
    Calculate future market value based on compound annual growth rate
    """
    future_value = current_value * (1 + growth_rate) ** years
    return round(future_value, 2)

# Project 2030 market size
current_market = 6.2  # trillion USD
cagr = 0.147  # 14.7%
projection_years = 6

projected_2030 = calculate_market_projection(current_market, cagr, projection_years)
print(f"Projected 2030 market size: \${projected_2030} trillion")
\`\`\`

## Regional Market Dynamics

Asia-Pacific dominates global e-commerce with a 49% market share, driven by China's massive domestic market and rapid adoption in Southeast Asian countries. The region's mobile-first approach and integrated super-app ecosystems create unique competitive advantages.`;

export const mixedContent = `# Quarterly Financial Performance Report - Q3 2024

## Financial Highlights

Revenue for Q3 2024 reached $847.2 million, representing a 23.7% increase compared to Q3 2023 ($684.9 million). This growth was driven by strong performance across all business segments, with Software as a Service (SaaS) products contributing $521.3 million (61.5% of total revenue) and Professional Services generating $325.9 million (38.5% of total revenue).

Net income improved significantly to $127.8 million, compared to $89.4 million in the same quarter last year. This represents a 42.9% year-over-year increase and demonstrates our continued focus on operational efficiency and margin improvement initiatives.

## Key Performance Metrics

### Revenue Analysis

The following table summarizes our revenue performance across major product categories:

| Product Category | Q3 2024 Revenue | Q3 2023 Revenue | Growth Rate |
|------------------|-----------------|-----------------|-------------|
| Cloud Platform   | $312.4M        | $267.1M        | 17.0%       |
| Analytics Suite  | $208.9M        | $158.3M        | 32.0%       |
| Security Solutions| $185.6M       | $142.8M        | 30.0%       |
| Professional Services| $140.3M    | $116.7M        | 20.2%       |

Our Analytics Suite showed exceptional growth at 32.0%, reflecting strong market demand for business intelligence solutions and our recent AI-powered features. Security Solutions maintained robust growth at 30.0%, driven by increased enterprise focus on cybersecurity and regulatory compliance.

### Customer Metrics and Retention

Customer acquisition reached 12,847 new customers in Q3, a 28% increase from Q3 2023. Our customer success initiatives have improved gross revenue retention to 97.3% and net revenue retention to 118.2%, indicating strong customer satisfaction and expansion within our existing customer base.

Annual Recurring Revenue (ARR) grew to $2.1 billion, representing 24% year-over-year growth. Average Revenue Per User (ARPU) increased to $23,450 annually, driven by successful upselling campaigns and the introduction of premium feature tiers.

## Operational Achievements

### Product Development and Innovation

We launched three major product updates during Q3, including our next-generation machine learning platform that processes over 50 billion data points daily. The platform uses advanced algorithms to provide real-time insights and predictive analytics for enterprise customers.

\`\`\`python
# Sample usage of our new ML platform API
import quantum_analytics as qa

# Initialize connection
client = qa.Client(api_key="your_api_key")

# Create predictive model
model = client.create_model(
    name="Sales Forecast Model",
    data_source="sales_data_warehouse",
    target_variable="monthly_revenue",
    features=["customer_segment", "product_category", "seasonality"]
)

# Train model with historical data
training_result = model.train(
    start_date="2022-01-01",
    end_date="2024-09-30",
    validation_split=0.2
)

print(f"Model accuracy: {training_result.accuracy:.2%}")
print(f"Training completed in: {training_result.duration_seconds}s")

# Generate predictions
predictions = model.predict(
    forecast_period="2024-Q4",
    confidence_interval=0.95
)
\`\`\`

### Market Expansion

We expanded operations into three new geographic markets: Brazil, India, and Southeast Asia. These regions represent significant growth opportunities with combined addressable markets exceeding $180 billion. Local partnerships and regulatory compliance preparations are progressing according to plan.

Our European operations achieved SOC 2 Type II certification, enabling us to serve regulated industries more effectively. Compliance investments totaling $12.3 million during Q3 position us for accelerated growth in financial services and healthcare sectors.

## Financial Position and Outlook

### Balance Sheet Strength

Total assets increased to $3.2 billion, with cash and cash equivalents of $687 million providing substantial liquidity for strategic initiatives. Debt-to-equity ratio remains conservative at 0.23, maintaining financial flexibility while supporting growth investments.

Research and development expenses totaled $156.7 million (18.5% of revenue), reflecting our commitment to innovation and product leadership. These investments focus on artificial intelligence, automation capabilities, and enhanced user experience across our platform ecosystem.

### Q4 2024 Guidance

Based on current market conditions and sales pipeline visibility, we project Q4 2024 revenue between $920-950 million, representing 20-24% year-over-year growth. Full-year 2024 revenue guidance is raised to $3.35-3.40 billion, an increase from our previous guidance of $3.25-3.35 billion.

We anticipate continued margin expansion driven by operational leverage and improved gross margins from our newer product offerings. Investment in sales and marketing will increase to support geographic expansion and new product launches planned for early 2025.`;