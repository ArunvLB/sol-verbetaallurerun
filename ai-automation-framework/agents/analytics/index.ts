import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';
import path from 'path';
import fs from 'fs';

const HISTORY_DIR = path.resolve(Config.BASE_DIR, 'history');
const ANALYTICS_DIR = path.resolve(Config.BASE_DIR, 'analytics');

export class AnalyticsAgent extends BaseAgent {
  constructor() {
    super('AnalyticsAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Running analytics and trend analysis...');

    await fs.promises.mkdir(HISTORY_DIR, { recursive: true });
    await fs.promises.mkdir(ANALYTICS_DIR, { recursive: true });

    // Archive current run results to history
    const currentResults = await StorageService.loadJson('results.json', Config.OUTPUT_DIR);
    const runId = `run-${Date.now()}`;
    const runEntry = {
      runId,
      url: context.url,
      timestamp: new Date().toISOString(),
      summary: currentResults?.summary || {},
      failures: currentResults?.failures || [],
      screenshots: (currentResults?.screenshots || []).length,
    };
    await StorageService.saveJson(`${runId}.json`, runEntry, HISTORY_DIR);
    Logger.info(this.name, `Archived run to history/${runId}.json`);

    // Load all history runs
    const allFiles = await fs.promises.readdir(HISTORY_DIR);
    const allRuns = [];
    for (const file of allFiles.filter(f => f.endsWith('.json')).sort()) {
      const data = await StorageService.loadJson(file, HISTORY_DIR);
      if (data) allRuns.push(data);
    }

    // Compute trends
    const passRates = allRuns.map(r => ({
      runId: r.runId,
      timestamp: r.timestamp,
      url: r.url,
      passRate: r.summary.totalTests
        ? parseFloat(((r.summary.passed / r.summary.totalTests) * 100).toFixed(1))
        : null,
      totalTests: r.summary.totalTests || 0,
      passed: r.summary.passed || 0,
      failed: r.summary.failed || 0,
      pagesScanned: r.summary.pagesScanned || 0,
    }));

    // Detect stability: tests that consistently fail across runs
    const allFailureKeys: Record<string, number> = {};
    for (const run of allRuns) {
      for (const failure of run.failures || []) {
        const key = `${failure.page}::${failure.test}`;
        allFailureKeys[key] = (allFailureKeys[key] || 0) + 1;
      }
    }
    const flakyTests = Object.entries(allFailureKeys)
      .filter(([, count]) => count > 1)
      .map(([key, occurrences]) => {
        const [page, test] = key.split('::');
        return { page, test, occurrences, status: 'flaky' };
      });

    // New failures in latest run vs previous
    const previousRun = allRuns.length >= 2 ? allRuns[allRuns.length - 2] : null;
    const prevFailureKeys = new Set((previousRun?.failures || []).map((f: any) => `${f.page}::${f.test}`));
    const currentFailures = runEntry.failures.map((f: any) => `${f.page}::${f.test}`);
    const newFailures = currentFailures.filter((k: string) => !prevFailureKeys.has(k));
    const fixedIssues = (Array.from(prevFailureKeys) as string[]).filter((k: string) => !currentFailures.includes(k));

    const analytics = {
      generatedAt: new Date().toISOString(),
      totalRuns: allRuns.length,
      latestRunId: runId,
      passRateTrend: passRates,
      flakyTests,
      newFailures: newFailures.map((k: string) => {
        const [page, test] = k.split('::');
        return { page, test };
      }),
      fixedIssues: fixedIssues.map(k => {
        const [page, test] = (k as string).split('::');
        return { page, test };
      }),
      stability: allRuns.length < 2 ? 'Not enough data for trend analysis' :
        flakyTests.length === 0 ? 'Stable - no recurring failures' :
          `${flakyTests.length} flaky test(s) detected`,
    };

    await StorageService.saveJson('analytics.json', analytics, ANALYTICS_DIR);
    context.analytics = analytics;

    Logger.info(this.name, `Analytics complete: ${allRuns.length} runs analyzed. Stability: ${analytics.stability}`);
    return context;
  }
}
