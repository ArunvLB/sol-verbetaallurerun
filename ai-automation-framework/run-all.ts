#!/usr/bin/env node
/**
 * run-all.ts — Single command to run automation + launch presentation UI
 * Usage: npm run run-all -- --url="https://your-site.com"
 */
import { execSync, spawn } from 'child_process';
import path from 'path';

const args = process.argv.slice(2);
const urlArg = args.find(a => a.startsWith('--url='));

if (!urlArg) {
  console.error('\n❌  Please provide --url:\n   npm run run-all -- --url="https://your-site.com"\n');
  process.exit(1);
}

const ROOT = path.resolve(__dirname);
const RENDERER_DIR = path.join(ROOT, 'presentation-renderer');

console.log('\n══════════════════════════════════════════════════════');
console.log(' 🤖 AI Automation Framework — Full Pipeline');
console.log('══════════════════════════════════════════════════════\n');

// Step 1: Run the full automation pipeline
console.log(`▶ STEP 1: Running automation for ${urlArg.replace('--url=', '')}`);
console.log('──────────────────────────────────────────────────────\n');

try {
  execSync(`npx ts-node index.ts ${urlArg}`, {
    cwd: ROOT,
    stdio: 'inherit'
  });
} catch (e) {
  console.error('\n❌  Automation pipeline failed. Check the error above.\n');
  process.exit(1);
}

// Step 2: Launch presentation renderer
console.log('\n──────────────────────────────────────────────────────');
console.log('▶ STEP 2: Launching Presentation Renderer UI');
console.log('──────────────────────────────────────────────────────\n');

const server = spawn('node', ['server.cjs'], {
  cwd: RENDERER_DIR,
  stdio: 'inherit',
  detached: false
});

server.on('error', (err) => {
  console.error('❌  Failed to start presentation server:', err.message);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down presentation server...\n');
  server.kill();
  process.exit(0);
});
