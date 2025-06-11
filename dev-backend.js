#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting backend development server...');

const backend = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

backend.on('close', (code) => {
  console.log(`Backend server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('\nShutting down backend server...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down backend server...');
  backend.kill('SIGTERM');
});