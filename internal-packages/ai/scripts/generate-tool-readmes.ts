#!/usr/bin/env tsx

/**
 * Tool README generation wrapper
 * Delegates to unified generate-readmes.ts script
 */

import { spawn } from 'child_process';
import path from 'path';

const script = path.join(__dirname, 'generate-readmes.ts');
const child = spawn('tsx', [script, '--mode', 'tools'], { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code || 0);
});