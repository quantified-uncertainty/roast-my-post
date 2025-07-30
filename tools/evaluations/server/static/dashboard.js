// Dashboard functionality
document.addEventListener('DOMContentLoaded', () => {
  const runButton = document.getElementById('runEvaluation');
  const testCasesButton = document.getElementById('viewTestCases');
  
  if (runButton) {
    runButton.addEventListener('click', showEvaluationDialog);
  }
  
  if (testCasesButton) {
    testCasesButton.addEventListener('click', showTestCases);
  }
});

async function showEvaluationDialog() {
  // For now, just run all tests
  const confirmed = confirm('Run evaluation on all test cases?');
  if (!confirmed) return;
  
  try {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runs: 3 })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      alert(`Evaluation started! ${result.testCount} tests with ${result.runs} runs each.\n\nCheck back in a few minutes for results.`);
      
      // Poll for completion (simple version)
      setTimeout(() => location.reload(), 30000);
    } else {
      alert('Error starting evaluation: ' + result.error);
    }
  } catch (error) {
    alert('Failed to start evaluation: ' + error.message);
  }
}

async function showTestCases() {
  try {
    const response = await fetch('/api/test-cases');
    const data = await response.json();
    
    // Create modal-like display
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      max-width: 800px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;
    
    content.innerHTML = `
      <h2>Test Cases (${data.total} total)</h2>
      <button onclick="this.closest('div').parentElement.remove()" style="float: right; margin-top: -40px;">Close</button>
      ${Object.entries(data.categories).map(([category, cases]) => `
        <h3>${category} (${cases.length})</h3>
        <ul style="list-style: none; padding: 0;">
          ${cases.map(tc => `
            <li style="padding: 8px; margin: 4px 0; background: #f8f9fa; border-radius: 4px;">
              <strong>${tc.name}</strong>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">
                ${tc.description}
              </div>
            </li>
          `).join('')}
        </ul>
      `).join('')}
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  } catch (error) {
    alert('Failed to load test cases: ' + error.message);
  }
}