# Alternative Architectures for Document Analysis

## Current Architecture Problems

1. **Too Many Files**: Separate scripts for each phase (analyze, generate tasks, create prompts, parse output, etc.)
2. **State Management**: Files scattered across directories, easy to lose track
3. **Error Propagation**: Bash + Node mixing makes errors hard to trace
4. **Fragile Parsing**: Regex-based output parsing from Claude
5. **Complex Dependencies**: Each phase depends on specific file formats from previous phases

## Alternative 1: Single Node.js Pipeline with Structured Output

```javascript
// Single file: analyze-document.js
class DocumentAnalyzer {
  async analyze(documentPath) {
    const doc = await this.loadDocument(documentPath);
    
    // All-in-one Claude prompt with JSON output
    const analysis = await this.callClaude({
      prompt: this.buildAnalysisPrompt(doc),
      responseFormat: 'json'
    });
    
    // Parallel task execution with retries
    const findings = await this.runTasksWithRetry(analysis.tasks);
    
    // Single synthesis call
    const report = await this.synthesize(findings);
    
    return { analysis, findings, report };
  }
}
```

**Benefits**:
- Single entry point
- Better error handling
- Easier to test
- State managed in memory

## Alternative 2: Stream-Based Architecture

```javascript
// Process documents as a stream
const pipeline = require('stream').pipeline;

pipeline(
  documentStream(),
  classifyDocuments(),
  parallel(analyzeDocument, { concurrency: 4 }),
  collectFindings(),
  synthesizeReport(),
  saveResults(),
  handleErrors
);
```

**Benefits**:
- Memory efficient
- Natural parallelism
- Easy to add/remove stages
- Built-in backpressure

## Alternative 3: Message Queue Architecture

```javascript
// Use Bull/BullMQ for job processing
const Queue = require('bull');

const analysisQueue = new Queue('document-analysis');
const tasksQueue = new Queue('analysis-tasks');
const synthesisQueue = new Queue('synthesis');

// Submit job
analysisQueue.add('analyze', { documentPath: 'doc.md' });

// Workers process independently
analysisQueue.process('analyze', async (job) => {
  const tasks = await classifyDocument(job.data);
  tasks.forEach(task => tasksQueue.add(task));
});
```

**Benefits**:
- Fault tolerant (auto-retry)
- Scalable (add more workers)
- Observable (UI dashboard)
- Persistent state

## Alternative 4: Function-as-a-Service Pattern

```javascript
// Each analysis type as a separate function
const analyses = {
  factual: async (doc) => findFactualErrors(doc),
  logical: async (doc) => findLogicalErrors(doc),
  statistical: async (doc) => findStatisticalErrors(doc),
};

// Simple orchestration
async function analyze(documentPath) {
  const doc = await readDocument(documentPath);
  
  // Run all analyses in parallel
  const results = await Promise.allSettled(
    Object.entries(analyses).map(([type, fn]) => 
      fn(doc).then(findings => ({ type, findings }))
    )
  );
  
  return combineResults(results);
}
```

**Benefits**:
- Each function is independent
- Easy to test individual analyses
- Natural parallelism
- Simple to add new analysis types

## Alternative 5: LangChain-Style Chain

```javascript
// Using a chain pattern similar to LangChain
const chain = new AnalysisChain()
  .addStep('classify', classifyDocument)
  .addStep('analyze', {
    factual: factualAnalysis,
    logical: logicalAnalysis,
  }, { parallel: true })
  .addStep('synthesize', synthesizeFindings)
  .addStep('report', generateReport);

const result = await chain.run(documentPath);
```

**Benefits**:
- Declarative pipeline
- Easy to modify flow
- Built-in retry/error handling
- Good abstractions

## Alternative 6: Single Claude Call with Tools

```javascript
// Let Claude orchestrate everything
async function analyzeWithTools(documentPath) {
  const document = await readFile(documentPath);
  
  const result = await claude.complete({
    prompt: `Analyze this document comprehensively...`,
    tools: [
      {
        name: 'web_search',
        description: 'Search web for fact checking',
        fn: webSearch
      },
      {
        name: 'check_citation', 
        description: 'Verify citations',
        fn: checkCitation
      }
    ],
    maxTokens: 8000
  });
  
  return result;
}
```

**Benefits**:
- Minimal orchestration code
- Claude decides what to check
- Single API call (mostly)
- Natural language output

## Recommended Approach: Simplified Pipeline

Based on your needs, I'd recommend a **simplified single-file pipeline**:

```javascript
#!/usr/bin/env node

const fs = require('fs').promises;
const pLimit = require('p-limit');

class SimpleAnalyzer {
  constructor(options = {}) {
    this.maxConcurrency = options.maxConcurrency || 4;
    this.limit = pLimit(this.maxConcurrency);
  }

  async analyze(documentPath) {
    console.log(`Analyzing ${documentPath}...`);
    
    try {
      // 1. Read and classify document
      const doc = await fs.readFile(documentPath, 'utf8');
      const classification = await this.classifyDocument(doc);
      
      // 2. Run analyses in parallel
      const analyses = this.getAnalysesForType(classification.type);
      const findings = await Promise.all(
        analyses.map(analysis => 
          this.limit(() => this.runAnalysis(doc, analysis))
        )
      );
      
      // 3. Generate report
      const report = await this.generateReport(doc, findings.flat());
      
      // 4. Save results
      await this.saveResults({ classification, findings, report });
      
      return { success: true, report };
      
    } catch (error) {
      console.error('Analysis failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  async classifyDocument(doc) {
    // Single Claude call to classify
    const response = await this.callClaude(`
      Classify this document and return JSON:
      { "type": "technical|research|opinion", "complexity": "high|medium|low" }
      
      Document: ${doc.slice(0, 1000)}...
    `);
    
    return JSON.parse(response);
  }
  
  getAnalysesForType(type) {
    const analyses = {
      technical: ['factual', 'logical', 'technical_accuracy'],
      research: ['factual', 'statistical', 'citations'],
      opinion: ['logical', 'argument_strength']
    };
    
    return analyses[type] || ['logical'];
  }
  
  async runAnalysis(doc, analysisType) {
    const prompts = {
      factual: 'Find all factual claims and verify them...',
      logical: 'Find logical inconsistencies...',
      statistical: 'Check statistical claims...',
      // etc
    };
    
    const response = await this.callClaude(
      prompts[analysisType] + '\n\n' + doc
    );
    
    return this.parseFindings(response, analysisType);
  }
  
  async callClaude(prompt) {
    // Simple wrapper around claude CLI
    const { exec } = require('child_process').promises;
    const { stdout } = await exec(`claude -p "${prompt}"`);
    return stdout;
  }
}

// Usage
if (require.main === module) {
  const analyzer = new SimpleAnalyzer();
  analyzer.analyze(process.argv[2]);
}
```

## Key Improvements Over Current Architecture

1. **Single File**: Everything in one place, easy to understand
2. **Simple State**: No intermediate files, all in memory
3. **Better Errors**: Try/catch with clear error messages
4. **Parallel but Simple**: Use p-limit instead of GNU parallel
5. **Flexible**: Easy to add/remove analysis types
6. **Testable**: Can unit test each method

## Migration Path

1. Start with the single-file analyzer
2. Add features incrementally
3. Only split into modules when necessary
4. Keep state in memory unless it gets too large
5. Use a job queue only if you need scaling

The key is to **start simple** and add complexity only when needed!