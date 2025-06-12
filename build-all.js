#!/usr/bin/env node

/**
 * Complete Build Script
 * Builds both frontend and backend in sequence
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runCommand(command, args, description) {
  return new Promise((resolve, reject) => {
    console.log(`🔨 ${description}...`);
    
    const process = spawn(command, args, {
      cwd: resolve(__dirname),
      stdio: 'inherit',
      shell: true
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${description} completed successfully!`);
        resolve();
      } else {
        console.error(`❌ ${description} failed with code: ${code}`);
        reject(new Error(`${description} failed`));
      }
    });

    process.on('error', (error) => {
      console.error(`❌ ${description} error:`, error.message);
      reject(error);
    });
  });
}

async function buildAll() {
  try {
    console.log('🚀 Starting complete build process...\n');
    
    // Build frontend
    await runCommand('npx', ['vite', 'build'], 'Frontend build');
    console.log('');
    
    // Build backend
    await runCommand('npx', [
      'esbuild',
      'server/index.ts',
      '--platform=node',
      '--packages=external',
      '--bundle',
      '--format=esm',
      '--outdir=dist'
    ], 'Backend build');
    
    console.log('\n🎉 Complete build finished successfully!');
    console.log('📁 Frontend: dist/ directory');
    console.log('📁 Backend: dist/index.js');
    console.log('🚀 Start production: NODE_ENV=production node dist/index.js');
    
  } catch (error) {
    console.error('\n💥 Build process failed:', error.message);
    process.exit(1);
  }
}

buildAll();