import { html } from 'hono/html';
import type { EvaluationResult } from './runner';

export function renderDashboard(files: any[]) {
  return html`<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Spelling/Grammar Evaluation Dashboard</title>
      <link rel="stylesheet" href="/static/styles.css">
    </head>
    <body>
      <div class="container">
        <header>
          <h1>📊 Spelling/Grammar Evaluation Dashboard</h1>
          <div class="actions">
            <button id="runEvaluation" class="btn btn-primary">Run New Evaluation</button>
            <button id="viewTestCases" class="btn">View Test Cases</button>
          </div>
        </header>
        
        <section class="recent-results">
          <h2>Recent Results</h2>
          ${files.length === 0 ? html`
            <div class="empty-state">
              <p>No evaluation results yet. Click "Run New Evaluation" to get started.</p>
            </div>
          ` : html`
            <div class="results-grid">
              ${files.map(file => html`
                <div class="result-card" onclick="window.location.href='/results/${file.name}'">
                  <h3>${file.name}</h3>
                  <div class="meta">
                    <span>📅 ${new Date(file.modified).toLocaleString()}</span>
                    <span>📦 ${(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              `)}
            </div>
          `}
        </section>
      </div>
      
      <script src="/static/dashboard.js"></script>
    </body>
    </html>`;
}

export function renderResults(data: any, filename: string) {
  const { metadata, results } = data;
  
  // Handle both old and new result formats
  if (!metadata || !results) {
    return html`<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invalid Result File</title>
        <link rel="stylesheet" href="/static/styles.css">
      </head>
      <body>
        <div class="container">
          <h1>Invalid Result File</h1>
          <p>The result file format is not recognized.</p>
          <a href="/" class="btn">Back to Dashboard</a>
        </div>
      </body>
      </html>`;
  }
  
  return html`<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Evaluation Results - ${filename}</title>
      <link rel="stylesheet" href="/static/styles.css">
    </head>
    <body>
      <div class="container">
        <header>
          <h1>📊 Evaluation Results</h1>
          <a href="/" class="btn">← Back to Dashboard</a>
        </header>
        
        <section class="summary">
          <h2>Summary</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${metadata.totalTests}</div>
              <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card ${metadata.passedTests === metadata.totalTests ? 'success' : ''}">
              <div class="stat-value">${metadata.passedTests}</div>
              <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card ${metadata.failedTests > 0 ? 'error' : ''}">
              <div class="stat-value">${metadata.failedTests}</div>
              <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${metadata.passRate}%</div>
              <div class="stat-label">Pass Rate</div>
            </div>
            <div class="stat-card ${metadata.avgConsistency < 90 ? 'warning' : ''}">
              <div class="stat-value">${metadata.avgConsistency}%</div>
              <div class="stat-label">Avg Consistency</div>
            </div>
          </div>
          
          <h3>Category Breakdown</h3>
          <div class="category-stats">
            ${Object.entries(metadata.categoryStats).map(([cat, stats]) => html`
              <div class="category-stat">
                <span class="category-name">${cat}</span>
                <span class="category-score">${stats.passed}/${stats.total}</span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${(stats.passed/stats.total)*100}%"></div>
                </div>
              </div>
            `)}
          </div>
        </section>
        
        <section class="results-table">
          <h2>Test Results</h2>
          <div class="filters">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="passed">Passed</button>
            <button class="filter-btn" data-filter="failed">Failed</button>
            <button class="filter-btn" data-filter="inconsistent">Inconsistent</button>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Test</th>
                <th>Category</th>
                <th>Runs</th>
                <th>Errors Found</th>
                <th>Consistency</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${results.map(result => html`
                <tr class="${result.overallPassed ? 'passed' : 'failed'}" data-status="${result.overallPassed ? 'passed' : 'failed'}" data-consistency="${result.consistencyScore}">
                  <td class="status">
                    ${result.overallPassed ? '✅' : '❌'}
                  </td>
                  <td class="test-name">
                    <strong>${result.testCase.name}</strong>
                    <div class="test-description">${result.testCase.description}</div>
                  </td>
                  <td>${result.testCase.category}</td>
                  <td class="runs">
                    ${result.runs.map((run, i) => html`
                      <span class="run-indicator ${run.passed ? 'success' : 'error'}" title="Run ${i+1}: ${run.duration}ms">
                        ${i+1}
                      </span>
                    `)}
                  </td>
                  <td class="errors">
                    ${getUniqueErrors(result.runs).map(error => html`
                      <div class="error-item">
                        <span class="error-text">${error.text}</span>
                        <span class="arrow">→</span>
                        <span class="error-correction">${error.correction}</span>
                        <span class="error-type ${error.type}">${error.type}</span>
                      </div>
                    `)}
                  </td>
                  <td class="consistency">
                    <span class="consistency-badge ${getConsistencyClass(result.consistencyScore)}">
                      ${result.consistencyScore}%
                    </span>
                  </td>
                  <td>
                    <button class="btn-small" onclick="toggleDetails('${result.testCase.id}')">
                      Details
                    </button>
                  </td>
                </tr>
                <tr class="details-row" id="details-${result.testCase.id}" style="display: none;">
                  <td colspan="7">
                    <div class="test-details">
                      <div class="detail-section">
                        <h4>Input</h4>
                        <pre>${result.testCase.input.text}</pre>
                        ${result.testCase.input.context ? html`<p>Context: ${result.testCase.input.context}</p>` : ''}
                      </div>
                      <div class="detail-section">
                        <h4>Expected</h4>
                        <ul>
                          <li>Should find errors: ${result.testCase.expectations.shouldFindErrors ? 'Yes' : 'No'}</li>
                          ${result.testCase.expectations.minErrors ? html`<li>Min errors: ${result.testCase.expectations.minErrors}</li>` : ''}
                          ${result.testCase.expectations.maxErrors ? html`<li>Max errors: ${result.testCase.expectations.maxErrors}</li>` : ''}
                        </ul>
                      </div>
                      <div class="detail-section">
                        <h4>Run Details</h4>
                        ${result.runs.map((run, i) => html`
                          <details class="run-detail">
                            <summary>
                              <span class="run-summary">
                                Run ${i+1} (${run.duration}ms) ${run.passed ? '✅' : '❌'}
                                ${run.failureReasons && run.failureReasons.length > 0 ? 
                                  html`<span class="failure-count">${run.failureReasons.length} issues</span>` : 
                                  run.errors.length > 0 ? 
                                  html`<span class="error-count">${run.errors.length} errors found</span>` : 
                                  ''}
                              </span>
                            </summary>
                            <div class="run-detail-content">
                              ${run.failureReasons && run.failureReasons.length > 0 ? html`
                                <div class="failure-reasons">
                                  <strong>Failure Reasons:</strong>
                                  <ul>
                                    ${run.failureReasons.map(reason => html`<li>${reason}</li>`)}
                                  </ul>
                                </div>
                              ` : ''}
                              
                              ${run.errors && run.errors.length > 0 ? html`
                                <div class="errors-found">
                                  <strong>Errors Found:</strong>
                                  <ul>
                                    ${run.errors.map(err => html`
                                      <li>
                                        "${err.text}" → "${err.correction}" 
                                        <span class="error-meta">(${err.type}, importance: ${err.importance})</span>
                                      </li>
                                    `)}
                                  </ul>
                                </div>
                              ` : ''}
                              
                              ${run.output ? html`
                                <div class="raw-output">
                                  <strong>Raw Output:</strong>
                                  <pre>${JSON.stringify(run.output, null, 2)}</pre>
                                </div>
                              ` : run.failureReasons && run.failureReasons.length > 0 ? '' : html`
                                <div class="no-output">
                                  <em>No output available - the tool may have encountered an error.</em>
                                </div>
                              `}
                            </div>
                          </details>
                        `)}
                      </div>
                    </div>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </section>
      </div>
      
      <script src="/static/results.js"></script>
    </body>
    </html>`;
}

function getUniqueErrors(runs: any[]) {
  const seen = new Set();
  const unique = [];
  
  for (const run of runs) {
    for (const error of run.errors) {
      const key = `${error.text}-${error.correction}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(error);
      }
    }
  }
  
  return unique;
}

function getConsistencyClass(score: number) {
  if (score === 100) return 'perfect';
  if (score >= 75) return 'good';
  return 'poor';
}