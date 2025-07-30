#!/usr/bin/env npx tsx

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8765;

// Directory paths
const EVALUATIONS_DIR = path.join(__dirname, '..');
const RESULTS_DIR = path.join(EVALUATIONS_DIR, 'results');
const VIEWERS_DIR = path.join(EVALUATIONS_DIR, 'viewers');

// Get list of result files with metadata
function getResultFiles() {
  try {
    const files = fs.readdirSync(RESULTS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(filename => {
        const filePath = path.join(RESULTS_DIR, filename);
        const stats = fs.statSync(filePath);
        
        // Extract timestamp from filename
        const timestampMatch = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
        const timestamp = timestampMatch ? 
          timestampMatch[1].replace(/T/, ' ').replace(/-/g, ':').replace(/(\d{4})-(\d{2})-(\d{2})/, '$1-$2-$3T') :
          stats.mtime.toISOString();
        
        return {
          name: filename,
          size: stats.size,
          timestamp,
          mtime: stats.mtime.getTime()
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Sort by most recent first
      
    return files;
  } catch (e) {
    console.error('Error reading results directory:', e);
    return [];
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  
  // API endpoint to list results
  if (url.pathname === '/api/list-results') {
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ files: getResultFiles() }));
    return;
  }
  
  // API endpoint to get latest file
  if (url.pathname === '/api/latest-results') {
    const files = getResultFiles();
    res.writeHead(200, { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ filename: files[0]?.name || null }));
    return;
  }
  
  // Serve result files
  if (url.pathname.startsWith('/evaluations/results/')) {
    const filename = path.basename(url.pathname);
    const filePath = path.join(RESULTS_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(content);
      return;
    }
  }
  
  // Default to viewer
  if (url.pathname === '/' || url.pathname === '/index.html') {
    const viewerPath = path.join(VIEWERS_DIR, 'index.html');
    const content = fs.readFileSync(viewerPath, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
    return;
  }
  
  // 404
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n🚀 Evaluation Dashboard running at: ${url}`);
  console.log(`📊 Opening browser...`);
  console.log(`\nPress Ctrl+C to stop\n`);
  
  // Open browser
  const opener = process.platform === 'darwin' ? 'open' : 
                 process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} "${url}"`);
});