#!/usr/bin/env node

const ErrorHunterV2 = require('./error-hunter-v2');
const path = require('path');

console.log('🚀 Starting Error Hunter v2...\n');

const hunter = new ErrorHunterV2({
  inputFile: path.join(__dirname, 'input.md'),
  maxIterations: 6,
  maxTurns: 10  // Reduced from 15 to speed up
});

hunter.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});