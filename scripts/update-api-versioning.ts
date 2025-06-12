#!/usr/bin/env tsx

/**
 * Script to update all API routes to use versioning (/api/v1)
 * This script processes both backend routes and frontend API calls
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// API endpoint patterns to update
const API_PATTERNS = [
  // Backend route definitions
  { pattern: /app\.(get|post|put|delete|patch)\(['"`]\/api\/(?!v\d+\/)/g, replacement: "app.$1('/api/v1/" },
  { pattern: /router\.(get|post|put|delete|patch)\(['"`]\/api\/(?!v\d+\/)/g, replacement: "router.$1('/api/v1/" },
  
  // Swagger documentation paths
  { pattern: /\* \/api\/(?!v\d+\/)/g, replacement: "* /api/v1/" },
  
  // Frontend API calls
  { pattern: /(['"`])\/api\/(?!v\d+\/)/g, replacement: "$1/api/v1/" },
  { pattern: /fetch\(['"`]\/api\/(?!v\d+\/)/g, replacement: "fetch('/api/v1/" },
  { pattern: /apiRequest\([^,]+,\s*['"`]\/api\/(?!v\d+\/)/g, replacement: match => match.replace('/api/', '/api/v1/') },
  
  // Query keys for React Query
  { pattern: /queryKey:\s*\[['"`]\/api\/(?!v\d+\/)/g, replacement: "queryKey: ['/api/v1/" },
  { pattern: /\[['"`]\/api\/(?!v\d+\/)/g, replacement: "['/api/v1/" }
];

function processFile(filePath: string): boolean {
  try {
    let content = readFileSync(filePath, 'utf8');
    let modified = false;

    for (const { pattern, replacement } of API_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        if (typeof replacement === 'function') {
          content = content.replace(pattern, replacement);
        } else {
          content = content.replace(pattern, replacement);
        }
        modified = true;
        console.log(`Updated ${matches.length} patterns in ${filePath}`);
      }
    }

    if (modified) {
      writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

function processDirectory(dirPath: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): void {
  const items = readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = join(dirPath, item);
    const stat = statSync(itemPath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and .git directories
      if (!item.startsWith('.') && item !== 'node_modules') {
        processDirectory(itemPath, extensions);
      }
    } else if (stat.isFile()) {
      const ext = item.substring(item.lastIndexOf('.'));
      if (extensions.includes(ext)) {
        processFile(itemPath);
      }
    }
  }
}

// Main execution
console.log('Starting API versioning update...');

// Process server files
console.log('Processing server files...');
processDirectory('./server');

// Process client files
console.log('Processing client files...');
processDirectory('./client');

// Process shared files
console.log('Processing shared files...');
processDirectory('./shared');

console.log('API versioning update completed!');
console.log('');
console.log('Next steps:');
console.log('1. Review the changes with git diff');
console.log('2. Test the application to ensure all endpoints work');
console.log('3. Update any hardcoded API URLs in configuration files');
console.log('4. Update deployment scripts and documentation');