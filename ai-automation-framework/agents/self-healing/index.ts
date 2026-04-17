import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';
import path from 'path';
import fs from 'fs';

const HEALING_DIR = path.resolve(Config.BASE_DIR, 'analytics');

export class SelfHealingAgent extends BaseAgent {
  constructor() {
    super('SelfHealingAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Analyzing failures for self-healing suggestions...');

    const results = await StorageService.loadJson('results.json', Config.OUTPUT_DIR);
    const failures = results?.failures || [];

    if (failures.length === 0) {
      Logger.info(this.name, 'No failures detected. Self-healing not required.');
      return context;
    }

    const healingLog: any[] = [];

    for (const failure of failures) {
      const suggestion = this.suggestFix(failure);
      healingLog.push({
        page: failure.page,
        test: failure.test,
        error: failure.error,
        severity: this.classifySeverity(failure.error || ''),
        suggestions: suggestion,
        autoHealable: suggestion.length > 0,
        status: 'pending-review',
        timestamp: new Date().toISOString(),
      });

      Logger.warn(this.name, `[Heal] ${failure.test} on ${failure.page}: ${suggestion.length} suggestion(s) generated.`);
    }

    const healingReport = {
      generatedAt: new Date().toISOString(),
      totalFailures: failures.length,
      healableCount: healingLog.filter(h => h.autoHealable).length,
      items: healingLog,
      note: 'Suggestions are advisory only. Set autoHeal:true in config to apply automatically.',
    };

    await fs.promises.mkdir(HEALING_DIR, { recursive: true });
    await StorageService.saveJson('self-healing-suggestions.json', healingReport, HEALING_DIR);

    context.healingReport = healingReport;
    Logger.info(this.name, `Self-healing suggestions saved: ${healingLog.length} items.`);
    return context;
  }

  private suggestFix(failure: any): string[] {
    const suggestions: string[] = [];
    const error = (failure.error || '').toLowerCase();

    if (error.includes('timeout')) {
      suggestions.push('Increase navigation timeout in Config.TIMEOUT');
      suggestions.push('Use page.waitForSelector() with longer timeout');
      suggestions.push('Check network latency or page rendering delays');
    }
    if (error.includes('selector') || error.includes('element not found')) {
      suggestions.push('Use more resilient locator: role-based or text-based selector');
      suggestions.push(`Alternative: page.getByRole('button', { name: '...' })`);
      suggestions.push(`Alternative: page.getByText('...')`);
    }
    if (error.includes('navigation') || error.includes('networkidle')) {
      suggestions.push(`Use waitUntil: 'domcontentloaded' instead of 'networkidle'`);
      suggestions.push('Add explicit waits before interacting with dynamic elements');
    }
    if (error.includes('form') || error.includes('input')) {
      suggestions.push('Verify form is visible before filling: await form.waitFor()');
      suggestions.push('Use page.fill() instead of type() for better reliability');
    }

    if (suggestions.length === 0) {
      suggestions.push('Review error log and add explicit wait before failing selector');
    }

    return suggestions;
  }

  private classifySeverity(error: string): 'high' | 'medium' | 'low' {
    if (error.toLowerCase().includes('timeout') || error.toLowerCase().includes('crash')) return 'high';
    if (error.toLowerCase().includes('selector') || error.toLowerCase().includes('not found')) return 'medium';
    return 'low';
  }
}
