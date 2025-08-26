"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MARKDOWN_COMPONENTS } from "@/components/DocumentWithEvaluations/config/markdown";

const pluginAnalysisExamples = `
# Plugin Analysis Results

## Summary Overview

| Plugin | Total Checked | 🔴 Errors | 🟡 Warnings | ✅ Verified | Success Rate | Execution Time |
|--------|---------------|-----------|-------------|-------------|--------------|----------------|
| 🔢 Math Checker | 16 expressions | 4 | 2 | 10 | 62.5% | 1.2s |
| ✏️ Spelling & Grammar | 2,456 words | 5 | 4 | - | 99.6% | 0.8s |
| 🔗 Link Validator | 26 URLs | 3 | 2 | 21 | 80.8% | 3.4s |
| ✅ Fact Checker | 8 claims | 1 | 2 | 5 | 62.5% | 2.1s |
| 📈 Forecaster | 5 predictions | - | 3 | 2 | 40% | 1.5s |

---

## 🔢 Math Checker Results

### Math Errors Found

<details><summary><strong>Expressions with Errors (4)</strong></summary>

<table>
<thead>
<tr>
<th>Expression</th>
<th>Error Type</th>
<th>Severity</th>
<th>Verification Status</th>
<th>Details</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>2 + 2 = 5</code></td>
<td>calculation</td>
<td>🔴 critical</td>
<td>verified_false</td>
<td>
<details><summary>View Full Analysis</summary>

### Error Details
**Error Explanation:** Basic arithmetic error. The sum of 2 + 2 equals 4, not 5.

**Corrected Version:** \`2 + 2 = 4\`  
**Concise Correction:** \`5 → 4\`

### Scoring Metrics
| Metric | Score | Description |
|--------|-------|-------------|
| Complexity | 10/100 | Very simple arithmetic |
| Context Importance | 80/100 | Critical for document accuracy |
| Error Severity | 90/100 | Fundamental math error |
| Verification | verified | MathJS confirmed |

### Verification Details
<details><summary>🔧 Debug Information</summary>

**Verified By:** mathjs  
**MathJS Result:**
\`\`\`json
{
  "status": "verified_false",
  "explanation": "Expression evaluates to false",
  "mathJsExpression": "2 + 2 == 5",
  "computedValue": "false",
  "steps": [
    {"expression": "2 + 2", "result": "4"},
    {"expression": "4 == 5", "result": "false"}
  ]
}
\`\`\`

**Line Number:** ~45 (estimated)  
**Processing Time:** 23ms

</details>

</details>
</td>
</tr>
<tr>
<td><code>√-4 = 2</code></td>
<td>logic</td>
<td>🟡 major</td>
<td>verified_false</td>
<td>
<details><summary>View Full Analysis</summary>

### Error Details
**Error Explanation:** Square root of negative number has no real solution. In complex numbers, √-4 = 2i.

**Corrected Version:** \`√-4 = 2i\` (complex) or "undefined in ℝ"  
**Concise Correction:** \`2 → 2i\`

### Scoring Metrics
| Metric | Score |
|--------|-------|
| Complexity | 30/100 |
| Context Importance | 70/100 |
| Error Severity | 80/100 |
| Verification | verified |

### Verification Details
<details><summary>🔧 Debug Information</summary>

**Verified By:** llm  
**LLM Result:**
\`\`\`json
{
  "status": "verified_false",
  "explanation": "Square root of negative number undefined in real numbers",
  "errorType": "logic",
  "severity": "major",
  "reasoning": "In real number system, square root of negative numbers is undefined. Result should be 2i in complex numbers."
}
\`\`\`

</details>

</details>
</td>
</tr>
<tr>
<td><code>10 / 0 = ∞</code></td>
<td>logic</td>
<td>🔴 critical</td>
<td>cannot_verify</td>
<td>
<details><summary>View Full Analysis</summary>

### Error Details
**Error Explanation:** Division by zero is undefined in standard arithmetic, not infinity.

**Corrected Version:** "undefined"  
**Concise Correction:** \`∞ → undefined\`

### Scoring Metrics
| Metric | Score |
|--------|-------|
| Complexity | 20/100 |
| Context Importance | 60/100 |
| Error Severity | 100/100 |
| Verification | unverifiable |

### Verification Details
<details><summary>🔧 Debug Information</summary>

**Verified By:** both  
**MathJS Error:** "Division by zero"  
**LLM Analysis:** "Mathematical undefined operation"  
**Tools Used:** ["mathjs", "llm"]

</details>

</details>
</td>
</tr>
<tr>
<td><code>∫x²dx = x³</code></td>
<td>calculation</td>
<td>🟢 minor</td>
<td>verified_warning</td>
<td>
<details><summary>View Full Analysis</summary>

### Error Details
**Error Explanation:** Missing division by 3 and constant of integration.

**Corrected Version:** \`∫x²dx = x³/3 + C\`  
**Concise Correction:** \`x³ → x³/3 + C\`

### Simplified Explanation
This is an indefinite integral. The antiderivative of x² requires dividing by 3 and adding a constant.

### Scoring Metrics
| Metric | Score |
|--------|-------|
| Complexity | 40/100 |
| Context Importance | 50/100 |
| Error Severity | 40/100 |
| Verification | verified |

</details>
</td>
</tr>
</tbody>
</table>

</details>

### Complex Expressions (No Errors)

<details><summary>High complexity expressions explained (2)</summary>

<table>
<thead>
<tr>
<th>Expression</th>
<th>Complexity</th>
<th>Importance</th>
<th>Explanation</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>∇²φ = ∂²φ/∂x² + ∂²φ/∂y²</code></td>
<td>90/100</td>
<td>85/100</td>
<td>
<details><summary>Simplified Explanation</summary>

The Laplacian operator in 2D Cartesian coordinates. This differential operator appears in:
- Heat equation (temperature distribution)
- Wave equation (sound, light propagation)
- Schrödinger equation (quantum mechanics)

**Verification Status:** verified  
**Processing:** Symbolic verification confirmed

</details>
</td>
</tr>
<tr>
<td><code>∑_{n=1}^∞ 1/n² = π²/6</code></td>
<td>85/100</td>
<td>75/100</td>
<td>
<details><summary>Simplified Explanation</summary>

Basel problem solution (Euler, 1734). This infinite series converges to exactly π²/6 ≈ 1.6449.

**Historical Note:** Solved by Euler, connecting number theory to analysis  
**Verification Status:** verified (known mathematical identity)

</details>
</td>
</tr>
</tbody>
</table>

</details>

---

## ✏️ Spelling & Grammar Results

### Errors by Category

<table>
<thead>
<tr>
<th>Type</th>
<th>Text</th>
<th>Correction</th>
<th>Concise</th>
<th>Importance</th>
<th>Confidence</th>
<th>Line #</th>
<th>Context</th>
</tr>
</thead>
<tbody>
<tr>
<td>🔴 spelling</td>
<td>recieve</td>
<td>receive</td>
<td>recieve → receive</td>
<td>85/100</td>
<td>100%</td>
<td>42</td>
<td>"...will recieve two..."</td>
</tr>
<tr>
<td>🔴 spelling</td>
<td>occured</td>
<td>occurred</td>
<td>occured → occurred</td>
<td>80/100</td>
<td>100%</td>
<td>67</td>
<td>"An error occured during..."</td>
</tr>
<tr>
<td>🟡 spelling</td>
<td>seperate</td>
<td>separate</td>
<td>seperate → separate</td>
<td>75/100</td>
<td>100%</td>
<td>89</td>
<td>"...to seperate the..."</td>
</tr>
<tr>
<td>🟡 grammar</td>
<td>The data are processed</td>
<td>The data is processed</td>
<td>are → is</td>
<td>60/100</td>
<td>90%</td>
<td>102</td>
<td>Subject-verb agreement</td>
</tr>
<tr>
<td>🟡 grammar</td>
<td>This is important finding</td>
<td>This is an important finding</td>
<td>+ an</td>
<td>70/100</td>
<td>95%</td>
<td>115</td>
<td>Missing article</td>
</tr>
</tbody>
</table>

### Additional Grammar Issues

<details><summary>View all grammar issues (4 total)</summary>

| Line | Issue Type | Original | Suggested | Description |
|------|------------|----------|-----------|-------------|
| ~89 | Tense Inconsistency | "We analyzed...and find" | "We analyzed...and found" | Maintain past tense |
| ~112 | Double Negative | "don't need no validation" | "don't need validation" | Remove double negative |

</details>

### Processing Metadata

<details><summary>🔧 Debug Information</summary>

| Metric | Value | Details |
|--------|-------|---------|
| Total Errors Found | 9 | Before limiting to maxErrors |
| Errors Returned | 9 | After limiting |
| Convention Detected | US | American English (auto-detected) |
| Convention Consistency | 0.85 | High consistency score |
| Processing Time | 823ms | Including language detection |
| Strictness Level | standard | Default checking level |
| Text Length | 2,456 words | ~12,280 characters |
| Language Detection Confidence | 92% | High confidence US English |
| Max Errors Setting | 50 | Configuration parameter |

**Performance Breakdown:**
- Language detection: 120ms
- Spelling check: 450ms
- Grammar check: 253ms

</details>

---

## 🔗 Link Validator Results

### Link Status Distribution

| Status | Count | Percentage | Severity |
|--------|-------|------------|----------|
| ✅ Valid (200) | 21 | 80.8% | success |
| 🔴 Not Found (404) | 2 | 7.7% | error |
| 🟡 Forbidden (403) | 1 | 3.8% | warning |
| 🟡 Rate Limited | 2 | 7.7% | warning |

### Validation Methods Used

| Method | Count | Percentage | Avg Response Time |
|--------|-------|------------|-------------------|
| HTTP Request | 18 | 69.2% | 234ms |
| LessWrong GraphQL API | 5 | 19.2% | 45ms |
| EA Forum GraphQL API | 3 | 11.5% | 52ms |

### Detailed Validations

<table>
<thead>
<tr>
<th>URL</th>
<th>Status</th>
<th>Method</th>
<th>Response Time</th>
<th>Details</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>example.com/old-docs</code></td>
<td>🔴 404</td>
<td>HTTP Request</td>
<td>234ms</td>
<td>
<details><summary>Full Response Details</summary>

**Error Type:** NotFound  
**Status Code:** 404  
**Final URL:** https://example.com/old-docs  
**Content Type:** text/html  

**Suggested Alternatives:**
- \`https://example.com/docs/v2\` - Current documentation
- \`https://archive.example.com/old-docs\` - Archived version

<details><summary>🔧 Debug Headers</summary>

\`\`\`json
{
  "server": "nginx/1.21.0",
  "date": "2024-01-15T10:23:45Z",
  "content-type": "text/html; charset=utf-8",
  "x-response-time": "234ms"
}
\`\`\`

</details>

</details>
</td>
</tr>
<tr>
<td><code>api.service.io/v1/endpoint</code></td>
<td>🟡 403</td>
<td>HTTP Request</td>
<td>156ms</td>
<td>
<details><summary>Full Response Details</summary>

**Error Type:** Forbidden  
**Status Code:** 403  
**Message:** "API key required"  
**Accessible:** false (requires authentication)

</details>
</td>
</tr>
<tr>
<td><code>lesswrong.com/posts/abc123</code></td>
<td>✅ 200</td>
<td>LessWrong GraphQL API</td>
<td>45ms</td>
<td>
<details><summary>Full Response Details</summary>

**Status Code:** 200  
**Content Type:** text/html  
**Title:** "Example Post Title"  
**Author:** "EliezerYudkowsky"  
**Karma:** 234  

</details>
</td>
</tr>
<tr>
<td><code>forum.effectivealtruism.org/posts/xyz</code></td>
<td>✅ 200</td>
<td>EA Forum GraphQL API</td>
<td>67ms</td>
<td>Valid EA Forum post</td>
</tr>
</tbody>
</table>

### Summary Statistics

<details><summary>🔧 Debug Information</summary>

**Error Breakdown:**
| Error Type | Count | URLs |
|------------|-------|------|
| NotFound | 2 | example.com/old-docs, dead-link.org |
| Forbidden | 1 | api.service.io/v1/endpoint |
| RateLimited | 2 | api.github.com/*, twitter.com/* |
| Timeout | 0 | - |
| NetworkError | 0 | - |

**Methods Used:**
| Validation Method | Count | Avg Response Time |
|------------------|-------|-------------------|
| HTTP Request | 20 | 187ms |
| LessWrong GraphQL API | 4 | 52ms |
| EA Forum GraphQL API | 2 | 71ms |

**Total Processing Time:** 3,421ms  
**Parallel Requests:** Yes (5 concurrent)  
**Cache Hits:** 0

</details>

---

## ✅ Fact Checking Results

### Fact Check Verdicts

<table>
<thead>
<tr>
<th>Claim</th>
<th>Verdict</th>
<th>Confidence</th>
<th>Evidence</th>
<th>Details</th>
</tr>
</thead>
<tbody>
<tr>
<td>"Python was released in 1991"</td>
<td>✅ true</td>
<td>high</td>
<td>Strong</td>
<td>
<details><summary>Full Verification</summary>

**Explanation:** Python was indeed first released on February 20, 1991 by Guido van Rossum.

**Sources:**
- [Python History](https://www.python.org/doc/essays/foreword/)
- [Wikipedia: History of Python](https://en.wikipedia.org/wiki/History_of_Python)

<details><summary>🔧 Debug Information</summary>

**Search Query:** "Python programming language release date 1991"  
**Perplexity Results:** 5 sources found  
**Processing Time:** 1,234ms  
**LLM Tokens Used:** 
- Input: 523
- Output: 187
- Total Cost: ~$0.012

</details>

</details>
</td>
</tr>
<tr>
<td>"React is faster than all other frameworks"</td>
<td>🟡 partially-true</td>
<td>medium</td>
<td>Mixed</td>
<td>
<details><summary>Full Verification</summary>

**Explanation:** React is performant but not universally fastest. Performance depends on use case and implementation.

**Corrections:** "React offers competitive performance for most use cases"  
**Concise Correction:** "fastest" → "performant"

**Benchmark Data:**
| Framework | Bundle Size | Time to Interactive | Runtime Performance |
|-----------|------------|-------------------|-------------------|
| Solid | 7KB | 89ms | Fastest |
| Svelte | 10KB | 98ms | Very Fast |
| Vue 3 | 34KB | 115ms | Fast |
| React | 42KB | 120ms | Fast |

</details>
</td>
</tr>
<tr>
<td>"Moore's Law doubles computing power every year"</td>
<td>🔴 false</td>
<td>high</td>
<td>Strong</td>
<td>
<details><summary>Full Verification</summary>

**Explanation:** Moore's Law states transistor density doubles approximately every TWO years, not one year.

**Corrections:** "Moore's Law states that the number of transistors on a microchip doubles approximately every two years"

**Concise Correction:** "every year" → "every two years"

<details><summary>🔧 Debug Information</summary>

**Original Quote (1965):** "The complexity for minimum component costs has increased at a rate of roughly a factor of two per year"  
**Revised (1975):** Moore updated prediction to every two years  
**Current Status:** Slowing to 2.5-3 years as of 2024

</details>

</details>
</td>
</tr>
<tr>
<td>"ChatGPT has 100 billion parameters"</td>
<td>❓ unverifiable</td>
<td>low</td>
<td>Insufficient</td>
<td>
<details><summary>Full Verification</summary>

**Explanation:** OpenAI has not publicly disclosed the exact parameter count for ChatGPT models.

**Known Information:**
- GPT-3: 175 billion parameters (confirmed)
- GPT-4: Parameter count not disclosed
- ChatGPT: Based on GPT-3.5 or GPT-4, exact size unknown

</details>
</td>
</tr>
<tr>
<td>"Climate change is real"</td>
<td>✅ true</td>
<td>high</td>
<td>Overwhelming</td>
<td>Scientific consensus >99%</td>
</tr>
</tbody>
</table>

### Research Notes

<details><summary>🔧 Debug: Perplexity Search Details</summary>

**Total Searches:** 3  
**Search Queries:**
1. "Python programming language release date 1991"
2. "React JavaScript framework performance comparison benchmarks 2024"
3. "Moore's Law transistor doubling period Gordon Moore"

**API Response Times:**
- Query 1: 1,234ms
- Query 2: 1,567ms
- Query 3: 989ms

**Total API Cost:** ~$0.021

</details>

---

## 📈 Forecaster Results

### Extracted Predictions with Scores

<table>
<thead>
<tr>
<th>Original Text</th>
<th>Rewritten Question</th>
<th>Author Prob</th>
<th>Scores</th>
<th>Resolution</th>
</tr>
</thead>
<tbody>
<tr>
<td>"AI will likely exceed human performance on all tasks by 2030"</td>
<td>Will AI exceed human performance on all benchmark tasks by 2030-12-31?</td>
<td>70%</td>
<td>
<details><summary>P:85 V:90 I:95 R:30</summary>
<div style="font-size: 0.9em; padding: 8px;">
<strong>Precision (85):</strong> Clear binary outcome with specific date<br/>
<strong>Verifiability (90):</strong> Can be checked via benchmarks<br/>
<strong>Importance (95):</strong> Central to document thesis<br/>
<strong>Robustness (30):</strong> Extraordinary claim, low empirical support
</div>
</details>
</td>
<td>2030-12-31</td>
</tr>
<tr>
<td>"Quantum computers will break RSA-2048 encryption within a decade"</td>
<td>Will a quantum computer successfully factor RSA-2048 by 2035-01-01?</td>
<td>40%</td>
<td>
<details><summary>P:90 V:95 I:85 R:45</summary>
<div style="font-size: 0.9em; padding: 8px;">
<strong>Precision (90):</strong> Specific cryptographic achievement<br/>
<strong>Verifiability (95):</strong> Public demonstration possible<br/>
<strong>Importance (85):</strong> Major technological milestone<br/>
<strong>Robustness (45):</strong> Progress accelerating but major hurdles remain
</div>
</details>
</td>
<td>2035-01-01</td>
</tr>
<tr>
<td>"Electric vehicles will dominate new car sales"</td>
<td>Will EVs exceed 30% of global new car sales by 2030?</td>
<td>80%</td>
<td>
<details><summary>P:75 V:100 I:70 R:75</summary>
<div style="font-size: 0.9em; padding: 8px;">
<strong>Precision (75):</strong> "Dominate" refined to >30% threshold<br/>
<strong>Verifiability (100):</strong> Sales data publicly available<br/>
<strong>Importance (70):</strong> Supporting claim for energy transition<br/>
<strong>Robustness (75):</strong> Current trajectory supports claim
</div>
</details>
</td>
<td>2030-12-31</td>
</tr>
</tbody>
</table>

<details><summary>🔧 Debug: Extraction Process</summary>

**Extraction Parameters:**
- Max Detailed Analysis: 3
- Min Quality Threshold: 60
- Strictness: standard

**Thinking Process Example:**
> "AI will likely exceed..." - The author uses "likely" which typically indicates 60-75% confidence. This is a prediction about AGI/ASI capabilities, measurable through benchmark performance. Converting to binary: specific date needed for resolution.

**Quality Filtering:**
- 5 predictions found initially
- 2 filtered out (quality score < 60)
- 3 predictions selected for detailed analysis

</details>

### Aggregate Forecast Analysis

<table>
<thead>
<tr>
<th>Question</th>
<th>Probability</th>
<th>Consensus</th>
<th>Std Dev</th>
<th>Details</th>
</tr>
</thead>
<tbody>
<tr>
<td>"Will AI exceed human performance on all tasks by 2030?"</td>
<td>12%</td>
<td>🟢 high</td>
<td>±3.2%</td>
<td>
<details><summary>Individual Forecasts & Reasoning</summary>

### Statistics
- **Mean:** 12.3%
- **Median:** 12%
- **Std Dev:** 3.2%
- **Range:** 8-16%

### Individual Forecasts
| Forecast | Probability | Reasoning |
|----------|------------|-----------|
| 1 | 15% | Progress is rapid but AGI requires breakthroughs in reasoning and generalization |
| 2 | 10% | Current architectures have fundamental limitations not solved by scale alone |
| 3 | 8% | Regulatory and safety concerns will significantly slow deployment |
| 4 | 14% | Possible but unlikely given current rate of progress and remaining challenges |
| 5 | 11% | Would require multiple paradigm shifts in next 5 years |
| 6 | 16% | Optimistic scenario considering recent acceleration in capabilities |

### Context from Perplexity Research
<details><summary>🔧 Debug: Research Sources</summary>

**Sources Consulted:**
1. "AGI Timeline Predictions" - Metaculus
2. "Expert Survey on Machine Intelligence" - AI Impacts
3. "Compute Trends in Machine Learning" - OpenAI

**Key Factors:**
- Compute scaling limits
- Algorithmic breakthroughs needed
- Data availability constraints
- Alignment challenges

</details>

</details>
</td>
</tr>
<tr>
<td>"Will quantum computers break RSA-2048 by 2035?"</td>
<td>35%</td>
<td>🟡 medium</td>
<td>±8.5%</td>
<td>
<details><summary>Individual Forecasts & Reasoning</summary>

### Statistics
- **Mean:** 35.0%
- **Median:** 35%
- **Std Dev:** 8.5%
- **Range:** 25-45%

### Individual Forecasts
| Forecast | Probability | Reasoning |
|----------|------------|-----------|
| 1 | 30% | Significant engineering challenges in error correction remain |
| 2 | 45% | Recent progress in error correction and logical qubits promising |
| 3 | 25% | Requires ~20M physical qubits, currently have ~1000 |
| 4 | 40% | Major commercial investments accelerating timeline |
| 5 | 35% | Possible if current exponential growth in qubit count continues |
| 6 | 35% | Post-quantum cryptography already being deployed as hedge |

</details>
</td>
</tr>
<tr>
<td>"Will electric vehicles be >30% of new car sales by 2030?"</td>
<td>72%</td>
<td>🟢 high</td>
<td>±5.1%</td>
<td>
<details><summary>Analysis</summary>

Currently at 18% globally, growing 35% yearly. Multiple countries have 2030-2035 ICE bans.

</details>
</td>
</tr>
</tbody>
</table>

### Forecasting Metadata

<details><summary>🔧 Debug Information</summary>

**Processing Details:**
- Total Forecasts Generated: 18 (6 per question × 3 questions)
- LLM Calls: 18 independent calls for diversity
- Total Processing Time: 4,523ms
- Average Time per Forecast: 251ms

**Token Usage:**
| Component | Input | Output | Cost |
|-----------|-------|--------|------|
| Individual Forecasts | 9,234 | 3,456 | $0.042 |
| Aggregation | 1,234 | 567 | $0.008 |
| **Total** | 10,468 | 4,023 | $0.050 |

**Perplexity Research:** Used for 2 of 3 questions  
**Research Queries:**
1. "AGI timeline predictions expert surveys 2024"
2. "Quantum computing qubit count progress RSA encryption"

</details>

---

## 📊 Overall Analysis Summary

<details><summary>Complete Analysis Statistics</summary>

### Performance Metrics
| Plugin | Items Processed | Errors Found | Processing Time | API Cost |
|--------|----------------|--------------|-----------------|----------|
| Math Checker | 16 | 4 | 1,234ms | $0.015 |
| Spelling & Grammar | 2,456 words | 9 | 823ms | $0.012 |
| Link Validator | 26 | 5 | 3,421ms | $0.000 |
| Fact Checker | 8 | 3 | 2,145ms | $0.021 |
| Forecaster | 3 | - | 4,523ms | $0.050 |
| **Total** | - | 21 issues | 12,146ms | $0.098 |

### Issue Severity Distribution
- 🔴 Critical: 6 issues (28.6%)
- 🟡 Warning: 10 issues (47.6%)
- 🟢 Minor: 5 issues (23.8%)

### Auto-fixable Issues
- Spelling: 5/5 (100%)
- Grammar: 0/4 (0%)
- Math: 0/4 (0%)
- Links: 1/5 (20% - HTTP→HTTPS)
- **Total:** 6/21 (28.6%)

### Confidence Levels
- High Confidence: 14 findings (66.7%)
- Medium Confidence: 5 findings (23.8%)
- Low Confidence: 2 findings (9.5%)

</details>

<details><summary>Export as JSON</summary>

\`\`\`json
{
  "timestamp": "2024-01-15T10:23:45Z",
  "document_id": "doc_12345",
  "plugins_run": ["math-checker", "spelling-grammar", "link-validator", "fact-checker", "forecaster"],
  "total_issues": 21,
  "critical_issues": 6,
  "processing_time_ms": 12146,
  "total_cost_usd": 0.098,
  "auto_fixable_percentage": 28.6
}
\`\`\`

</details>

---

# Alternative Visualizations

## 📊 Executive Dashboard

<table style="width: 100%">
<tr>
<td colspan="3" style="text-align: center; background: #f3f4f6; padding: 20px">

### Document Health Score: 72/100
<div style="background: #e5e7eb; border-radius: 8px; height: 30px; position: relative">
<div style="background: linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%); width: 72%; height: 100%; border-radius: 8px"></div>
</div>

**21 issues found** | **6 critical** | **10 warnings** | **5 minor**

</td>
</tr>
</table>

### 🎯 Top Priority Actions

| Priority | Issue | Location | Fix Type | Impact |
|----------|-------|----------|----------|--------|
| 1 | Math: Division by zero | Line 134 | Manual | 🔴 High - Breaks calculation flow |
| 2 | Link: 404 Not Found (2) | Lines 23, 56 | Update URLs | 🔴 High - Dead references |
| 3 | Fact: Moore's Law incorrect | Line 123 | Rewrite | 🔴 High - Misinformation |
| 4 | Spelling: 5 typos | Various | Auto-fix available | 🟡 Medium - Professionalism |
| 5 | Grammar: Missing articles | Lines 67, 89 | Manual | 🟢 Low - Readability |

---

## 📈 Quality Metrics

### Visual Progress Indicators

<table>
<tr><th>Category</th><th>Score</th><th>Visual</th><th>Grade</th></tr>
<tr>
<td>Math Accuracy</td>
<td>62.5%</td>
<td>████████████░░░░░░░░░░░░░░░░░░</td>
<td>D+</td>
</tr>
<tr>
<td>Spelling Quality</td>
<td>99.6%</td>
<td>██████████████████████████████</td>
<td>A+</td>
</tr>
<tr>
<td>Link Health</td>
<td>80.8%</td>
<td>████████████████████████░░░░░░</td>
<td>B</td>
</tr>
<tr>
<td>Fact Accuracy</td>
<td>62.5%</td>
<td>████████████░░░░░░░░░░░░░░░░░░</td>
<td>D+</td>
</tr>
<tr>
<td>Forecast Confidence</td>
<td>40%</td>
<td>████████░░░░░░░░░░░░░░░░░░░░░░</td>
<td>F</td>
</tr>
<tr>
<td><strong>Overall</strong></td>
<td><strong>72%</strong></td>
<td><strong>██████████████████░░░░░░░░░░░░</strong></td>
<td><strong>C+</strong></td>
</tr>
</table>

---

## 🔧 Fix Priority Queue

### 🚀 Auto-Fixable (1-Click Solutions)

<table>
<thead>
<tr><th>Type</th><th>Count</th><th>Command/Action</th><th>Time</th></tr>
</thead>
<tbody>
<tr>
<td>✏️ Spelling</td>
<td>5 errors</td>
<td>

<details><summary>Copy fix command</summary>

\`\`\`bash
sed -i -e 's/recieve/receive/g' \\
       -e 's/occured/occurred/g' \\
       -e 's/seperate/separate/g' \\
       -e 's/accomodate/accommodate/g' \\
       -e 's/definately/definitely/g' document.md
\`\`\`

</details>

</td>
<td>&lt;1s</td>
</tr>
<tr>
<td>🔗 HTTP→HTTPS</td>
<td>1 link</td>
<td>\`sed -i 's|http://|https://|g' document.md\`</td>
<td>&lt;1s</td>
</tr>
</tbody>
</table>

### ⚡ Quick Manual Fixes (< 5 min)

| Issue | Location | Current | Fix | Estimated Time |
|-------|----------|---------|-----|----------------|
| Math: 2+2=5 | Line 45 | \`2 + 2 = 5\` | \`2 + 2 = 4\` | 30s |
| Math: Integration | Line 201 | \`∫x²dx = x³\` | \`∫x²dx = x³/3 + C\` | 1 min |
| Grammar: Article | Line 67 | "This is important finding" | "This is an important finding" | 30s |
| Grammar: Tense | Line 89 | "analyzed...and find" | "analyzed...and found" | 30s |

### 🔍 Needs Investigation (> 5 min)

<details><summary>Complex fixes requiring research (5 items)</summary>

<table>
<thead>
<tr><th>Type</th><th>Issue</th><th>Research Needed</th><th>Est. Time</th></tr>
</thead>
<tbody>
<tr>
<td>🔗 Links</td>
<td>404 - example.com/old-docs</td>
<td>Find new documentation URL</td>
<td>5-10 min</td>
</tr>
<tr>
<td>🔗 Links</td>
<td>403 - api.service.io</td>
<td>Check API authentication requirements</td>
<td>10-15 min</td>
</tr>
<tr>
<td>✅ Facts</td>
<td>React performance claim</td>
<td>Update with current benchmarks</td>
<td>15 min</td>
</tr>
<tr>
<td>🔢 Math</td>
<td>√-4 domain error</td>
<td>Clarify real vs complex context</td>
<td>5 min</td>
</tr>
<tr>
<td>📈 Forecast</td>
<td>AI timeline claims</td>
<td>Update with recent expert surveys</td>
<td>20 min</td>
</tr>
</tbody>
</table>

</details>

---

## 🎯 Impact × Effort Matrix

<table style="width: 100%; height: 400px">
<tr>
<td colspan="2" style="text-align: center; font-weight: bold">Impact × Effort Prioritization</td>
</tr>
<tr style="height: 50%">
<td style="width: 50%; background: #dcfce7; vertical-align: top; padding: 10px">

### 🏆 Quick Wins
**High Impact, Low Effort**

- **Math L45**: 2+2=5 (30s fix)
- **Spelling**: All 5 errors (auto-fix)
- **HTTP→HTTPS**: Line 89 (auto-fix)

*Do these first!*

</td>
<td style="width: 50%; background: #fee2e2; vertical-align: top; padding: 10px">

### 🎯 Major Projects
**High Impact, High Effort**

- **Broken Links**: Research & update (20 min)
- **Fact Checking**: Moore's Law rewrite (15 min)
- **Math L134**: Division by zero refactor (10 min)

*Schedule time for these*

</td>
</tr>
<tr style="height: 50%">
<td style="background: #fef3c7; vertical-align: top; padding: 10px">

### 📝 Fill-ins
**Low Impact, Low Effort**

- **Grammar**: Missing articles (2 min)
- **Math**: Add integration constant (1 min)

*Do when you have spare time*

</td>
<td style="background: #f3f4f6; vertical-align: top; padding: 10px">

### 💤 Low Priority
**Low Impact, High Effort**

- **Forecast updates**: Research latest (30 min)
- **Complex grammar**: Restructure sentences (15 min)

*Consider skipping*

</td>
</tr>
</table>

---

## 🗺️ Document Heatmap

### Issue Density by Section

<table>
<thead>
<tr><th>Lines</th><th>Visual Density</th><th>Issues</th><th>Breakdown</th></tr>
</thead>
<tbody>
<tr>
<td>1-50</td>
<td>██░░░░░░░░</td>
<td>3</td>
<td>🔴×1 🟡×1 🟢×1</td>
</tr>
<tr>
<td>51-100</td>
<td>████████░░</td>
<td>7</td>
<td>🔴×2 🟡×3 🟢×2</td>
</tr>
<tr>
<td>101-150</td>
<td>██████░░░░</td>
<td>5</td>
<td>🔴×2 🟡×2 🟢×1</td>
</tr>
<tr>
<td>151-200</td>
<td>████░░░░░░</td>
<td>4</td>
<td>🔴×1 🟡×3</td>
</tr>
<tr>
<td>201-250</td>
<td>██░░░░░░░░</td>
<td>2</td>
<td>🟡×1 🟢×1</td>
</tr>
<tr>
<td>251-300</td>
<td>░░░░░░░░░░</td>
<td>0</td>
<td>Clean ✨</td>
</tr>
</tbody>
</table>

### Hotspot Analysis

<details><summary>Top 3 Problem Areas</summary>

**Lines 51-100** (7 issues)
- Clustered math errors in formula section
- Multiple grammar issues
- 1 broken link

**Lines 101-150** (5 issues)  
- Fact checking errors
- Spelling mistakes
- Link validation failures

**Lines 1-50** (3 issues)
- Introduction has spelling errors
- One critical math error

</details>

---

## 🔗 Cross-Plugin Correlations

### Related Issues by Location

<table>
<thead>
<tr><th>Location</th><th>Multiple Issues</th><th>Relationship</th><th>Combined Fix</th></tr>
</thead>
<tbody>
<tr>
<td>Line 45</td>
<td>🔢 Math + ✏️ Grammar</td>
<td>Same sentence</td>
<td>Rewrite entire sentence</td>
</tr>
<tr>
<td>Line 89</td>
<td>🔢 Math + 🔗 Link</td>
<td>Math example links to broken resource</td>
<td>Fix math & update link together</td>
</tr>
<tr>
<td>Line 123</td>
<td>✅ Fact + ✏️ Spelling</td>
<td>Misspelled word in false claim</td>
<td>Rewrite claim with correct spelling</td>
</tr>
<tr>
<td>Lines 67-70</td>
<td>✏️ Grammar × 3</td>
<td>Paragraph has multiple issues</td>
<td>Rewrite paragraph</td>
</tr>
</tbody>
</table>

### Pattern Detection

<details><summary>Recurring Issues & Root Causes</summary>

| Pattern | Occurrences | Examples | Likely Cause | Solution |
|---------|-------------|----------|--------------|----------|
| "ie/ei" confusion | 3 | recieve, beleive | Common spelling pattern | Spell checker |
| Missing articles | 4 | "is important finding" | ESL pattern | Grammar checker |
| Integration constants | 2 | ∫xdx = x² | Math notation habit | Review conventions |
| 404 on old docs | 2 | /v1/docs, /old-api | Outdated references | Update all docs links |

</details>

---

## 📈 Processing Timeline

### Plugin Execution Flow

<pre style="background: #f3f4f6; padding: 10px; border-radius: 5px">
[0ms]━━━━━━━[823ms]━━━━━━━[1234ms]━━━━━━━[2145ms]━━━━━━━[3421ms]━━━━━━━[4523ms]
      ✏️           🔢            ✅            🔗            📈
   Spelling      Math         Facts         Links      Forecasts
    (9 err)     (4 err)      (3 err)       (5 err)    (analysis)
      ↓           ↓             ↓             ↓            ↓
   823ms       411ms         911ms        1276ms       1102ms
</pre>

### Performance Breakdown

| Phase | Duration | Percentage | Cost |
|-------|----------|------------|------|
| Spelling & Grammar | 823ms | 18% | $0.012 |
| Math Analysis | 411ms | 9% | $0.015 |
| Fact Checking | 911ms | 20% | $0.021 |
| Link Validation | 1276ms | 28% | $0.000 |
| Forecasting | 1102ms | 24% | $0.050 |
| **Total** | **4523ms** | **100%** | **$0.098** |

---

## 📝 Before/After Preview

### Impact of All Fixes

<table>
<thead>
<tr><th>Metric</th><th>Current</th><th>After Fixes</th><th>Improvement</th></tr>
</thead>
<tbody>
<tr>
<td>Document Score</td>
<td>72/100</td>
<td>95/100</td>
<td style="color: green">+23 points</td>
</tr>
<tr>
<td>Critical Issues</td>
<td>6</td>
<td>0</td>
<td style="color: green">-6 🎉</td>
</tr>
<tr>
<td>Total Issues</td>
<td>21</td>
<td>0</td>
<td style="color: green">-21 ✨</td>
</tr>
<tr>
<td>Math Accuracy</td>
<td>62.5%</td>
<td>100%</td>
<td style="color: green">+37.5%</td>
</tr>
<tr>
<td>Link Health</td>
<td>80.8%</td>
<td>100%</td>
<td style="color: green">+19.2%</td>
</tr>
</tbody>
</table>

### Example Transformations

<details><summary>See before/after examples</summary>

<table>
<thead>
<tr><th>Before ❌</th><th>After ✅</th></tr>
</thead>
<tbody>
<tr>
<td>The sum 2 + 2 = 5</td>
<td>The sum 2 + 2 = 4</td>
</tr>
<tr>
<td>We will recieve the data</td>
<td>We will receive the data</td>
</tr>
<tr>
<td>Moore's Law: doubles yearly</td>
<td>Moore's Law: doubles every two years</td>
</tr>
<tr>
<td>This is important finding</td>
<td>This is an important finding</td>
</tr>
<tr>
<td>http://insecure-site.com</td>
<td>https://insecure-site.com</td>
</tr>
</tbody>
</table>

</details>

---

## 🎨 Compact Summary View

### At-a-Glance Status

<pre style="font-family: monospace; background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 5px">
╔════════════════════════════════════════════════════════════╗
║ Document Analysis │ example-doc.md │ 2024-01-15 10:23:45   ║
╠════════════════╤═══════════╤════════════╤═════════════════╣
║ Math     [4/16]│ ●●●●○○○○○○│  62.5% │ 🔴🔴🟡🟢        ║
║ Spelling [9]   │ ●●●●●●●●● │  99.6% │ 🔴🔴🔴🔴🔴🟡🟡🟡🟡║
║ Links    [5/26]│ ●●●●●○○○○○│  80.8% │ 🔴🔴🟡🟡🟡       ║
║ Facts    [3/8] │ ●●●○○○○○○○│  62.5% │ 🔴🟡🟡           ║
║ Forecast [3/5] │ ●●●○○○○○○○│  40.0% │ 🟡🟡🟡           ║
╠════════════════╧═══════════╧════════════╧═════════════════╣
║ Overall Score: C+ (72/100) │ Fix: 6 auto, 15 manual       ║
║ Processing: 4.5s │ Cost: $0.098 │ Confidence: 85%        ║
╚════════════════════════════════════════════════════════════╝
</pre>

</details>
`;

export default function PluginAnalysisShowcase() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Plugin Analysis Examples</h1>
          <p className="mt-2 text-gray-600">
            Complete plugin output with all data fields and debug information
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-8 shadow">
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={MARKDOWN_COMPONENTS}
            >
              {pluginAnalysisExamples}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}