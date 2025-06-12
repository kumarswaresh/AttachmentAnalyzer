#!/usr/bin/env node

/**
 * Frontend Build Script
 * Builds the React frontend using Vite
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Building frontend...');

const buildProcess = spawn('npx', ['vite', 'build'], {
  cwd: resolve(__dirname),
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Frontend build completed successfully!');
    console.log('📁 Output: dist/ directory');
  } else {
    console.error('❌ Frontend build failed with code:', code);
    process.exit(code);
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Frontend build error:', error.message);
  process.exit(1);
});