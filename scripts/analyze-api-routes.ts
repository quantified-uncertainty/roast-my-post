#!/usr/bin/env tsx

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface RouteAnalysis {
  path: string;
  methods: string[];
  authentication: {
    type: 'none' | 'session' | 'apiKey' | 'both';
    details: string[];
  };
  httpStatusCodes: number[];
  errorHandling: {
    hasConsistentErrors: boolean;
    errorPatterns: string[];
  };
  restCompliance: {
    isCompliant: boolean;
    issues: string[];
  };
}

function findAllRoutes(dir: string): string[] {
  const routes: string[] = [];
  
  function walk(currentDir: string) {
    const files = readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = join(currentDir, file);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (file === 'route.ts' || file === 'route.js') {
        routes.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return routes;
}

function analyzeRoute(filePath: string): RouteAnalysis {
  const content = readFileSync(filePath, 'utf-8');
  const relativePath = filePath.replace(/.*\/app\/api/, '/api').replace(/\/route\.ts$/, '');
  
  // Extract HTTP methods
  const methods: string[] = [];
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    methods.push(match[1]);
  }
  
  // Analyze authentication
  const authentication = {
    type: 'none' as 'none' | 'session' | 'apiKey' | 'both',
    details: [] as string[]
  };
  
  if (content.includes('authenticateRequest(')) {
    authentication.type = 'both';
    authentication.details.push('Uses authenticateRequest (API key first, then session)');
  } else if (content.includes('authenticateRequestSessionFirst(')) {
    authentication.type = 'both';
    authentication.details.push('Uses authenticateRequestSessionFirst (session first, then API key)');
  } else if (content.includes('authenticateApiKey(') || content.includes('authenticateApiKeySimple(')) {
    authentication.type = 'apiKey';
    authentication.details.push('Uses API key authentication only');
  } else if (content.includes('await auth()') || content.includes('getServerSession')) {
    authentication.type = 'session';
    authentication.details.push('Uses session authentication only');
  } else {
    authentication.details.push('No authentication found');
  }
  
  // Extract HTTP status codes
  const statusCodes: number[] = [];
  const statusRegex = /status:\s*(\d{3})/g;
  while ((match = statusRegex.exec(content)) !== null) {
    const code = parseInt(match[1]);
    if (!statusCodes.includes(code)) {
      statusCodes.push(code);
    }
  }
  
  // Analyze error handling
  const errorHandling = {
    hasConsistentErrors: false,
    errorPatterns: [] as string[]
  };
  
  if (content.includes('try {') && content.includes('catch')) {
    errorHandling.errorPatterns.push('Has try-catch error handling');
  }
  
  if (content.includes('{ error:')) {
    errorHandling.errorPatterns.push('Returns { error: ... } format');
  }
  
  if (content.includes('NextResponse.json(')) {
    errorHandling.errorPatterns.push('Uses NextResponse.json');
  }
  
  errorHandling.hasConsistentErrors = errorHandling.errorPatterns.length > 0;
  
  // Analyze REST compliance
  const restCompliance = {
    isCompliant: true,
    issues: [] as string[]
  };
  
  // Check method-path alignment
  methods.forEach(method => {
    if (method === 'GET' && relativePath.includes('[')) {
      // GET with params is fine
    } else if (method === 'POST' && relativePath.includes('[')) {
      restCompliance.issues.push(`POST on resource with ID (${relativePath}) - should typically be on collection`);
    } else if (method === 'PUT' && !relativePath.includes('[')) {
      restCompliance.issues.push(`PUT on collection (${relativePath}) - should typically be on specific resource`);
    } else if (method === 'DELETE' && !relativePath.includes('[')) {
      restCompliance.issues.push(`DELETE on collection (${relativePath}) - should typically be on specific resource`);
    }
  });
  
  // Check status codes
  methods.forEach(method => {
    if (method === 'POST' && !statusCodes.includes(201)) {
      restCompliance.issues.push('POST should return 201 Created for resource creation');
    }
    if (method === 'DELETE' && !statusCodes.includes(204)) {
      restCompliance.issues.push('DELETE could return 204 No Content');
    }
  });
  
  restCompliance.isCompliant = restCompliance.issues.length === 0;
  
  return {
    path: relativePath,
    methods,
    authentication,
    httpStatusCodes: statusCodes.sort((a, b) => a - b),
    errorHandling,
    restCompliance
  };
}

// Main analysis
const apiDir = join(process.cwd(), 'src/app/api');
const routes = findAllRoutes(apiDir);
const analyses = routes.map(analyzeRoute);

// Group by authentication type
const unprotectedRoutes = analyses.filter(a => a.authentication.type === 'none');
const sessionOnlyRoutes = analyses.filter(a => a.authentication.type === 'session');
const apiKeyOnlyRoutes = analyses.filter(a => a.authentication.type === 'apiKey');
const bothAuthRoutes = analyses.filter(a => a.authentication.type === 'both');

// Find REST compliance issues
const nonCompliantRoutes = analyses.filter(a => !a.restCompliance.isCompliant);

// Find inconsistent error handling
const inconsistentErrorRoutes = analyses.filter(a => !a.errorHandling.hasConsistentErrors);

// Print report
console.log('=== API Route Security & Consistency Analysis ===\n');

console.log(`Total routes analyzed: ${analyses.length}\n`);

console.log('=== Authentication Summary ===');
console.log(`Unprotected routes: ${unprotectedRoutes.length}`);
console.log(`Session-only auth: ${sessionOnlyRoutes.length}`);
console.log(`API key-only auth: ${apiKeyOnlyRoutes.length}`);
console.log(`Both auth methods: ${bothAuthRoutes.length}\n`);

if (unprotectedRoutes.length > 0) {
  console.log('⚠️  UNPROTECTED ROUTES (Security Risk):');
  unprotectedRoutes.forEach(route => {
    console.log(`  - ${route.path} [${route.methods.join(', ')}]`);
  });
  console.log();
}

console.log('=== Authentication Details ===');
console.log('\nSession-only routes:');
sessionOnlyRoutes.forEach(route => {
  console.log(`  - ${route.path} [${route.methods.join(', ')}]`);
});

console.log('\nAPI key-only routes:');
apiKeyOnlyRoutes.forEach(route => {
  console.log(`  - ${route.path} [${route.methods.join(', ')}]`);
});

console.log('\nBoth auth methods:');
bothAuthRoutes.forEach(route => {
  console.log(`  - ${route.path} [${route.methods.join(', ')}] - ${route.authentication.details[0]}`);
});

if (nonCompliantRoutes.length > 0) {
  console.log('\n=== REST Compliance Issues ===');
  nonCompliantRoutes.forEach(route => {
    console.log(`\n${route.path}:`);
    route.restCompliance.issues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  });
}

console.log('\n=== HTTP Status Code Usage ===');
const allStatusCodes = new Set<number>();
analyses.forEach(a => a.httpStatusCodes.forEach(code => allStatusCodes.add(code)));
console.log(`Status codes in use: ${Array.from(allStatusCodes).sort((a, b) => a - b).join(', ')}`);

console.log('\n=== Inconsistent Error Handling ===');
if (inconsistentErrorRoutes.length > 0) {
  console.log('Routes without proper error handling:');
  inconsistentErrorRoutes.forEach(route => {
    console.log(`  - ${route.path}`);
  });
} else {
  console.log('✅ All routes have error handling');
}

// Detailed route listing
console.log('\n=== Detailed Route Analysis ===');
analyses.sort((a, b) => a.path.localeCompare(b.path)).forEach(analysis => {
  console.log(`\n${analysis.path}`);
  console.log(`  Methods: ${analysis.methods.join(', ') || 'NONE'}`);
  console.log(`  Auth: ${analysis.authentication.type} - ${analysis.authentication.details.join('; ')}`);
  console.log(`  Status codes: ${analysis.httpStatusCodes.join(', ') || 'NONE'}`);
  if (!analysis.restCompliance.isCompliant) {
    console.log(`  REST issues: ${analysis.restCompliance.issues.join('; ')}`);
  }
});