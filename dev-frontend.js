#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting frontend development server...');

const vite = spawn('npx', ['vite', '--port', '3000', '--host', '0.0.0.0'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});

vite.on('close', (code) => {
  console.log(`Frontend server exited with code ${code}`);
  process.exit(code);
});

process.on('SIGINT', () => {
  console.log('\nShutting down frontend server...');
  vite.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down frontend server...');
  vite.kill('SIGTERM');
});