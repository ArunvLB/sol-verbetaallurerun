import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { BrowserService } from '../../services/browser';
import { Config } from '../../core/config';
import { Page } from 'playwright';

type FlowStep =
  | { type: 'setViewport'; width: number; height: number }
  | { type: 'navigate'; url: string }
  | { type: 'click'; selectors: string[][]; offsetX?: number; offsetY?: number }
  | { type: 'fill'; selectors: string[][]; value: string }
  | { type: 'waitForSelector'; selectors: string[][]; timeout?: number }
  | { type: 'assertTitle'; equals?: string; contains?: string };

interface StepResult {
  index: number;
  type: string;
  status: 'pass' | 'fail';
  message?: string;
}

/**
 * Executes a provided happy-path flow (login -> dashboard -> operations -> logout, etc.)
 * and simultaneously records it into a webrecorder-compatible JSON for reuse.
 *
 * Provide steps in `context.flowScript` with the above schema.
 */
export class FlowExecutionAgent extends BaseAgent {
  constructor() {
    super('FlowExecutionAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    const script: FlowStep[] = context.flowScript || [];
    if (!script.length) {
      Logger.info(this.name, 'No flowScript provided; skipping.');
      return context;
    }

    const browser = context.browser as BrowserService;
    const page = browser?.page as Page | undefined;
    if (!page) {
      Logger.error(this.name, 'Browser page not available; aborting flow execution.');
      return context;
    }

    Logger.step(this.name, `Running provided happy-path flow with ${script.length} step(s)...`);
    const results: StepResult[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < script.length; i++) {
      const step = script[i];
      try {
        switch (step.type) {
          case 'setViewport':
            await page.setViewportSize({ width: step.width, height: step.height });
            results.push({ index: i, type: step.type, status: 'pass' });
            break;
          case 'navigate':
            await browser.navigate(step.url);
            visited.add(step.url);
            // store navigation title
            const title = await page.title();
            if (!context.navigationData) context.navigationData = {};
            context.navigationData[step.url] = { title };
            results.push({ index: i, type: step.type, status: 'pass' });
            break;
          case 'click': {
            const locator = await this.resolveLocator(page, step.selectors);
            if (!locator) throw new Error('No selector matched');
            await locator.click({
              timeout: 15000,
              position:
                typeof step.offsetX === 'number' && typeof step.offsetY === 'number'
                  ? { x: step.offsetX, y: step.offsetY }
                  : undefined
            });
            results.push({ index: i, type: step.type, status: 'pass' });
            break;
          }
          case 'fill': {
            const locator = await this.resolveLocator(page, step.selectors);
            if (!locator) throw new Error('No selector matched');
            await locator.fill(step.value, { timeout: 15000 });
            results.push({ index: i, type: step.type, status: 'pass' });
            break;
          }
          case 'waitForSelector': {
            const locator = await this.resolveLocator(page, step.selectors);
            if (!locator) throw new Error('No selector matched');
            await locator.waitFor({ timeout: step.timeout || 15000 });
            results.push({ index: i, type: step.type, status: 'pass' });
            break;
          }
          case 'assertTitle': {
            const title = await page.title();
            if (step.equals && title !== step.equals) {
              throw new Error(`Title mismatch: expected "${step.equals}", got "${title}"`);
            }
            if (step.contains && !title.includes(step.contains)) {
              throw new Error(`Title missing text "${step.contains}", got "${title}"`);
            }
            results.push({ index: i, type: step.type, status: 'pass' });
            break;
          }
          default:
            results.push({ index: i, type: (step as any).type, status: 'fail', message: 'Unsupported step type' });
        }
      } catch (err: any) {
        const msg = err?.message || 'unknown error';
        results.push({ index: i, type: (step as any).type, status: 'fail', message: msg });
        Logger.error(this.name, `Step ${i} failed`, msg);
        break; // stop early on failure to keep sessions predictable
      }
    }

    // Persist a webrecorder-compatible file for later replay
    const recording = { title: context.flowTitle || 'Happy path flow', steps: script };
    await StorageService.saveJson('webrecorder.json', recording, Config.OUTPUT_DIR);

    // Propagate visited pages to downstream agents
    if (visited.size) {
      context.pages = Array.from(new Set([...(context.pages || []), ...visited]));
    }
    context.recordingSteps = script;

    await StorageService.saveJson('flow-run.json', { results }, Config.OUTPUT_DIR);
    Logger.info(this.name, `Flow execution finished: ${results.filter(r => r.status === 'pass').length}/${results.length} steps passed.`);
    return context;
  }

  private normalizeSelector(raw: string): string {
    if (raw.startsWith('xpath')) return `xpath=${raw.slice(5)}`;
    if (raw.startsWith('text/')) return `text=${raw.slice(5)}`;
    if (raw.startsWith('pierce/')) return `pierce=${raw.slice(7)}`;
    if (raw.startsWith('aria/')) return `aria/${raw.slice(5)}`;
    return raw;
  }

  private async resolveLocator(page: Page, selectorGroups: string[][]) {
    for (const group of selectorGroups) {
      for (const raw of group) {
        const sel = this.normalizeSelector(raw);
        const loc = page.locator(sel);
        if ((await loc.count()) > 0) return loc.first();
      }
    }
    return null;
  }
}

