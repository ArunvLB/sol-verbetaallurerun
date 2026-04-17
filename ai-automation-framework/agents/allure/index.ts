import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { Config } from '../../core/config';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

type AllureStatus = 'passed' | 'failed' | 'skipped' | 'broken';

export class AllureReportAgent extends BaseAgent {
  constructor() {
    super('AllureReportAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Generating Allure-compatible results and email-friendly summary...');

    const tests = context.testResults || [];
    const allureDir = path.join(Config.REPORTS_DIR, 'allure-results');
    await fs.mkdir(allureDir, { recursive: true });

    if (!tests.length) {
      Logger.info(this.name, 'No test results found; skipping Allure artifacts.');
      return context;
    }

    await this.writeExecutor(allureDir);

    for (const t of tests) {
      const uuid = crypto.randomUUID();
      const status: AllureStatus = t.status === 'fail' ? 'failed' : 'passed';
      const payload = {
        uuid,
        historyId: `${t.page || 'unknown'}-${t.test}`,
        name: t.test || 'Unnamed Test',
        fullName: `${t.page || 'Unknown Page'} :: ${t.test || 'Unnamed Test'}`,
        status,
        stage: 'finished',
        statusDetails: t.error ? { message: t.error } : {},
        steps: [],
        attachments: [],
        parameters: [{ name: 'page', value: t.page || 'n/a' }],
        labels: [
          { name: 'suite', value: t.page || 'Default Suite' },
          { name: 'framework', value: 'custom-e2e' }
        ]
      };

      await fs.writeFile(
        path.join(allureDir, `${uuid}-result.json`),
        JSON.stringify(payload, null, 2),
        'utf-8'
      );
    }

    await this.writeEmailSummary(tests);

    Logger.info(this.name, `Allure results saved to ${allureDir}`);
    Logger.info(this.name, `Email-ready summary saved to ${path.join(Config.OUTPUT_DIR, 'allure-email-summary.html')}`);
    return context;
  }

  private async writeExecutor(allureDir: string) {
    const executor = {
      name: 'Solwer.beta web automation reports',
      type: 'custom',
      reportName: 'Solwer.beta web automation reports',
      buildName: 'Web UI smoke',
      buildUrl: '',
      reportUrl: '',
      buildOrder: Date.now()
    };
    await fs.writeFile(
      path.join(allureDir, 'executor.json'),
      JSON.stringify(executor, null, 2),
      'utf-8'
    );
  }

  private async writeEmailSummary(tests: any[]) {
    const summaryPath = path.join(Config.OUTPUT_DIR, 'allure-email-summary.html');
    const rows = tests
      .map(
        (t) => `
          <tr>
            <td>${t.page || 'n/a'}</td>
            <td>${t.test || 'Unnamed Test'}</td>
            <td>${t.status}</td>
            <td>${t.error || ''}</td>
          </tr>`
      )
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Allure Test Summary</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 16px; }
      h1 { margin-top: 0; }
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f4f4f4; text-align: left; }
      .passed { color: #0a7f2e; }
      .failed { color: #c00; }
    </style>
  </head>
  <body>
    <h1>Allure Test Summary</h1>
    <p>Attach this HTML to your email, or zip the entire <code>reports/allure-results</code> folder and share with teammates who can run <code>allure serve</code>.</p>
    <table>
      <thead>
        <tr><th>Page</th><th>Test</th><th>Status</th><th>Error</th></tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </body>
</html>`;

    await fs.writeFile(summaryPath, html, 'utf-8');
  }
}
