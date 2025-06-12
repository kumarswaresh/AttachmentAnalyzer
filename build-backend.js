#!/usr/bin/env node

/**
 * Backend Build Script
 * Builds the Express server using esbuild
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Building backend...');

const buildArgs = [
  'esbuild',
  'server/index.ts',
  '--platform=node',
  '--packages=external',
  '--bundle',
  '--format=esm',
  '--outdir=dist'
];

const buildProcess = spawn('npx', buildArgs, {
  cwd: resolve(__dirname),
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Backend build completed successfully!');
    console.log('📁 Output: dist/index.js');
    console.log('🚀 Run with: NODE_ENV=production node dist/index.js');
  } else {
    console.error('❌ Backend build failed with code:', code);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Backend build error:', error.message);
  process.exit(1);
});