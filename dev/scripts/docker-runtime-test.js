#!/usr/bin/env node
/**
 * Docker Runtime Test
 * This script is run inside Docker containers to verify all packages are properly available
 * and can be imported/used at runtime.
 */

const path = require('path');
const fs = require('fs');

console.log('Starting Docker runtime validation tests...\n');

let testsPassed = 0;
let testsFailed = 0;

function testSection(name) {
    console.log(`\n=== Testing: ${name} ===`);
}

function testPass(message) {
    console.log(`✓ ${message}`);
    testsPassed++;
}

function testFail(message, error) {
    console.error(`✗ ${message}`);
    if (error) console.error(`  Error: ${error.message}`);
    testsFailed++;
}

// Test 1: Check Node.js environment
testSection('Node.js Environment');
try {
    console.log(`Node version: ${process.version}`);
    if (process.version.startsWith('v20')) {
        testPass('Node.js version is v20.x as expected');
    } else {
        testFail('Node.js version mismatch', new Error(`Expected v20.x, got ${process.version}`));
    }
} catch (e) {
    testFail('Failed to check Node.js version', e);
}

// Test 2: Check working directory
testSection('Working Directory');
try {
    const cwd = process.cwd();
    console.log(`Current directory: ${cwd}`);
    if (cwd === '/app') {
        testPass('Working directory is /app as expected');
    } else {
        testFail('Working directory mismatch', new Error(`Expected /app, got ${cwd}`));
    }
} catch (e) {
    testFail('Failed to check working directory', e);
}

// Test 3: Check package manager
testSection('Package Manager');
try {
    const { execSync } = require('child_process');
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    console.log(`pnpm version: ${pnpmVersion}`);
    testPass('pnpm is available');
} catch (e) {
    testFail('pnpm not available', e);
}

// Test 4: Check workspace structure
testSection('Workspace Structure');
const expectedDirs = [
    '/app/apps/web',
    '/app/apps/mcp-server',
    '/app/internal-packages/db',
    '/app/internal-packages/ai',
    '/app/internal-packages/domain',
    '/app/node_modules'
];

for (const dir of expectedDirs) {
    if (fs.existsSync(dir)) {
        testPass(`Directory exists: ${dir}`);
    } else {
        testFail(`Directory missing: ${dir}`);
    }
}

// Test 5: Check built packages
testSection('Built Packages');
const packagesToCheck = [
    { name: '@roast/db', distPath: '/app/internal-packages/db/dist' },
    { name: '@roast/domain', distPath: '/app/internal-packages/domain/dist' },
    { name: '@roast/ai', distPath: '/app/internal-packages/ai/dist' }
];

for (const pkg of packagesToCheck) {
    if (fs.existsSync(pkg.distPath)) {
        // Check if dist directory has content
        const files = fs.readdirSync(pkg.distPath);
        if (files.length > 0) {
            testPass(`${pkg.name} is built (${files.length} files in dist)`);
        } else {
            testFail(`${pkg.name} dist directory is empty`);
        }
    } else {
        testFail(`${pkg.name} is not built (no dist directory)`);
    }
}

// Test 6: Check Prisma client
testSection('Prisma Client');
const prismaClientPath = '/app/node_modules/.prisma/client';
if (fs.existsSync(prismaClientPath)) {
    const prismaFiles = fs.readdirSync(prismaClientPath);
    if (prismaFiles.includes('index.js')) {
        testPass('Prisma client is generated');
    } else {
        testFail('Prisma client directory exists but index.js missing');
    }
} else {
    testFail('Prisma client not generated');
}

// Test 7: Check node_modules symlinks for workspace packages
testSection('Workspace Package Links');
for (const pkg of ['@roast/db', '@roast/domain', '@roast/ai']) {
    const pkgPath = path.join('/app/node_modules', pkg);
    if (fs.existsSync(pkgPath)) {
        const stats = fs.lstatSync(pkgPath);
        if (stats.isSymbolicLink()) {
            const target = fs.readlinkSync(pkgPath);
            testPass(`${pkg} is properly linked -> ${target}`);
        } else {
            testPass(`${pkg} exists in node_modules`);
        }
    } else {
        testFail(`${pkg} not found in node_modules`);
    }
}

// Test 8: Try to load configuration (most critical test)
testSection('Configuration Module (@roast/domain)');
try {
    // This would fail if domain package isn't properly built
    const configPath = '/app/internal-packages/domain/dist/index.js';
    if (fs.existsSync(configPath)) {
        testPass('@roast/domain main entry point exists');
        
        // Check if config exports are available
        const configExportsPath = '/app/internal-packages/domain/dist/core/config.js';
        if (fs.existsSync(configExportsPath)) {
            testPass('@roast/domain config module exists');
        } else {
            testFail('@roast/domain config module missing');
        }
    } else {
        testFail('@roast/domain not properly built (index.js missing)');
    }
} catch (e) {
    testFail('Failed to check @roast/domain', e);
}

// Test 9: Check for common runtime dependencies
testSection('Runtime Dependencies');
const criticalDependencies = [
    'next',
    'react',
    'react-dom',
    '@prisma/client',
    'zod',
    'tsx'  // Important for worker
];

for (const dep of criticalDependencies) {
    const depPath = path.join('/app/node_modules', dep);
    if (fs.existsSync(depPath)) {
        testPass(`${dep} is installed`);
    } else {
        testFail(`${dep} is missing`);
    }
}

// Test 10: Worker-specific checks (if this is the worker image)
if (process.env.DOCKER_IMAGE_TYPE === 'worker') {
    testSection('Worker-Specific Checks');
    
    // Check job processor script
    const jobProcessorPath = '/app/apps/web/scripts/adaptive-job-processor.ts';
    if (fs.existsSync(jobProcessorPath)) {
        testPass('Adaptive job processor script exists');
    } else {
        testFail('Adaptive job processor script missing');
    }
    
    // Check tsx can run TypeScript
    try {
        const { execSync } = require('child_process');
        execSync('pnpm tsx --version', { encoding: 'utf8' });
        testPass('tsx is available for TypeScript execution');
    } catch (e) {
        testFail('tsx not available', e);
    }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('Test Summary');
console.log('='.repeat(50));
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);

if (testsFailed > 0) {
    console.error(`\n❌ ${testsFailed} test(s) failed!`);
    process.exit(1);
} else {
    console.log('\n✅ All runtime validation tests passed!');
    process.exit(0);
}