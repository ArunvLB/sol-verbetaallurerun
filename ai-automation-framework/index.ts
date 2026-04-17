import { Command } from 'commander';
import { OrchestratorAgent } from './agents/orchestrator';

const program = new Command();

program
  .name('ai-automation-framework')
  .description('AI-powered website automation framework phase-1')
  .requiredOption('--url <url>', 'Website URL to analyze and test');

program.parse(process.argv);
const options = program.opts();

async function main() {
  const orchestrator = new OrchestratorAgent();
  await orchestrator.execute({ url: options.url });
}

main().catch(console.error);
