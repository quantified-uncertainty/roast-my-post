#!/usr/bin/env npx tsx

// Load environment variables
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url || '');
const __dirname = path.dirname(__filename);

// Try multiple paths to find .env
const envPaths = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '..', '.env.local'),
  path.join(__dirname, '..', '..', '.env.local'),
  path.join(__dirname, '..', '..', '..', '.env.local'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
  path.join(__dirname, '..', '..', '..', '.env'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`[Server] Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('[Server] Warning: Could not load .env file from any of the expected paths');
}

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { serveStatic } from '@hono/node-server/serve-static';
import { testCases } from '../data/test-cases';
import { runEvaluation } from './runner';
import { renderDashboard, renderResults } from './views';
import * as fs from 'fs/promises';

const app = new Hono();
const PORT = 8765;

// Middleware
app.use('*', cors());
app.use('*', logger());

// Serve static files
app.use('/static/*', serveStatic({ root: path.join(process.cwd(), 'server') }));

// Home page - Dashboard
app.get('/', async (c) => {
  const localResultsDir = path.join(process.cwd(), 'results');
  const parentResultsDir = path.join(process.cwd(), '..', 'results');
  
  // Get files from both directories
  const localFiles = await getResultFiles(localResultsDir);
  const parentFiles = await getResultFiles(parentResultsDir);
  
  // Merge and deduplicate by filename
  const allFiles = [...localFiles];
  const localFileNames = new Set(localFiles.map(f => f.name));
  
  for (const file of parentFiles) {
    if (!localFileNames.has(file.name)) {
      allFiles.push(file);
    }
  }
  
  // Sort by modified date
  allFiles.sort((a, b) => 
    new Date(b.modified).getTime() - new Date(a.modified).getTime()
  );
  
  return c.html(renderDashboard(allFiles));
});

// API: List test cases
app.get('/api/test-cases', (c) => {
  return c.json({
    total: testCases.length,
    categories: groupByCategory(testCases),
    cases: testCases
  });
});

// API: List results
app.get('/api/results', async (c) => {
  const resultsDir = path.join(process.cwd(), 'results');
  const files = await getResultFiles(resultsDir);
  return c.json({ files });
});

// API: Get specific result
app.get('/api/results/:filename', async (c) => {
  const filename = c.req.param('filename');
  let filepath = path.join(process.cwd(), 'results', filename);
  
  try {
    // Try exact filename first
    const content = await fs.readFile(filepath, 'utf-8');
    return c.json(JSON.parse(content));
  } catch (e) {
    // Try with .json extension
    if (!filename.endsWith('.json')) {
      try {
        filepath = path.join(process.cwd(), 'results', filename + '.json');
        const content = await fs.readFile(filepath, 'utf-8');
        return c.json(JSON.parse(content));
      } catch (e2) {
        return c.json({ error: 'File not found' }, 404);
      }
    }
    return c.json({ error: 'File not found' }, 404);
  }
});

// API: Run evaluation
app.post('/api/evaluate', async (c) => {
  const body = await c.req.json();
  const { testIds, runs = 3 } = body;
  
  // Filter test cases
  const casesToRun = testIds 
    ? testCases.filter(t => testIds.includes(t.id))
    : testCases;
  
  if (casesToRun.length === 0) {
    return c.json({ error: 'No test cases selected' }, 400);
  }
  
  // Start evaluation (async - returns immediately)
  const evaluationId = Date.now().toString();
  runEvaluationAsync(evaluationId, casesToRun, runs);
  
  return c.json({ 
    evaluationId, 
    message: 'Evaluation started',
    testCount: casesToRun.length,
    runs
  });
});

// API: Get evaluation status
app.get('/api/evaluate/:id/status', async (c) => {
  const id = c.req.param('id');
  // TODO: Implement real status tracking
  return c.json({ 
    id, 
    status: 'running',
    progress: 50,
    message: 'Running tests...'
  });
});

// View results page
app.get('/results/:filename', async (c) => {
  const filename = c.req.param('filename');
  const resultsDir = path.join(process.cwd(), 'results');
  let filepath = path.join(resultsDir, filename);
  
  console.log(`[Results] Looking for: ${filepath}`);
  
  try {
    // Try the exact filename first
    const content = await fs.readFile(filepath, 'utf-8');
    const data = JSON.parse(content);
    console.log(`[Results] Found file, rendering...`);
    return c.html(renderResults(data, filename));
  } catch (e: any) {
    console.log(`[Results] Error: ${e.message}`);
    // If not found, try with .json extension
    if (!filename.endsWith('.json')) {
      filepath = path.join(resultsDir, filename + '.json');
      console.log(`[Results] Trying with .json: ${filepath}`);
      try {
        const content = await fs.readFile(filepath, 'utf-8');
        const data = JSON.parse(content);
        console.log(`[Results] Found file with .json, rendering...`);
        return c.html(renderResults(data, filename));
      } catch (e2: any) {
        console.log(`[Results] Error with .json: ${e2.message}`);
        return c.text('Result not found', 404);
      }
    }
    return c.text('Result not found', 404);
  }
});

// Helper functions
async function getResultFiles(dir: string) {
  try {
    await fs.access(dir);
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const fileStats = await Promise.all(
      jsonFiles.map(async (filename) => {
        const stats = await fs.stat(path.join(dir, filename));
        return {
          name: filename,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          timestamp: extractTimestamp(filename)
        };
      })
    );
    
    return fileStats.sort((a, b) => 
      new Date(b.modified).getTime() - new Date(a.modified).getTime()
    );
  } catch (e) {
    return [];
  }
}

function extractTimestamp(filename: string): string {
  const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
  if (match) {
    return match[1].replace(/T/, ' ').replace(/-/g, ':').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3T');
  }
  return new Date().toISOString();
}

function groupByCategory(cases: typeof testCases) {
  const groups: Record<string, typeof testCases> = {};
  cases.forEach(tc => {
    if (!groups[tc.category]) {
      groups[tc.category] = [];
    }
    groups[tc.category].push(tc);
  });
  return groups;
}

async function runEvaluationAsync(id: string, cases: typeof testCases, runs: number) {
  try {
    console.log(`Starting evaluation ${id} with ${cases.length} tests, ${runs} runs each`);
    const results = await runEvaluation(cases, runs);
    
    // Save results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `evaluation-${timestamp}.json`;
    const filepath = path.join(process.cwd(), 'results', filename);
    
    // Ensure results directory exists
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    console.log(`Evaluation ${id} completed. Results saved to ${filename}`);
  } catch (error) {
    console.error(`Evaluation ${id} failed:`, error);
  }
}

// Start server
console.log(`🚀 Starting evaluation server on port ${PORT}...`);
serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`✅ Server running at http://localhost:${info.port}`);
});