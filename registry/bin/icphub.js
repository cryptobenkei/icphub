#!/usr/bin/env node

// This is a wrapper that uses tsx to run the TypeScript CLI
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the TypeScript CLI using tsx
const tsx = spawn('npx', ['tsx', join(__dirname, 'icphub.ts')], {
  stdio: 'inherit',
  cwd: dirname(__dirname)
});

tsx.on('exit', (code) => {
  process.exit(code);
});

tsx.on('error', (error) => {
  console.error('Error running icphub CLI:', error);
  process.exit(1);
});