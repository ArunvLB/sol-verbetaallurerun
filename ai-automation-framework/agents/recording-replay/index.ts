import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { BrowserService } from '../../services/browser';
import { Config } from '../../core/config';
import { Page } from 'playwright';

type BaseStep = { type: string };
type RecordingStep =
  | (BaseStep & { type: 'setViewport'; width: number; height: number; deviceScaleFactor?: number; isMobile?: boolean; hasTouch?: boolean; isLandscape?: boolean })
  | (BaseStep & {
      type: 'navigate';
      url: string;
      assertedEvents?: { type: string; url?: string; title?: string }[];
    })
  | (BaseStep & {
      type: 'click';
      selectors: string[][];
      offsetX?: number;
      offsetY?: number;
      target?: string;
    });

interface StepResult {
  index: number;
  type: string;
  target?: string;
  status: 'pass' | 'fail';
  message?: string;
}

interface RegressionCase {
  id: string;
  title: string;
  steps: string[];
  expected: string;
}

/**
 * Replays a Chrome DevTools-style recording (like the user's webrecorder JSON)
 * with Playwright, logs step outcomes, and emits lightweight regression cases
 * that can be turned into automated tests later.
 *
 * Usage:
 *   - Attach `recordingSteps` to the AgentContext (array of steps), OR
 *   - Drop a JSON file at output/webrecorder.json with shape { title, steps: [...] }.
 */
export class RecordingReplayAgent extends BaseAgent {
  constructor() {
    super('RecordingReplayAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    const browser = context.browser as BrowserService;
    const page = browser?.page as Page | undefined;
    if (!page) {
      Logger.error(this.name, 'Browser page not available; aborting replay.');
      return context;
    }

    const recording = await this.loadRecording(context);
    if (!recording.steps.length) {
      Logger.warn(this.name, 'No recording steps found. Skipping replay.');
      return context;
    }

    Logger.step(this.name, `Replaying recording: ${recording.title || 'Unnamed recording'}`);

    const results: StepResult[] = [];
    const visited = new Set<string>();

    for (let i = 0; i < recording.steps.length; i++) {
      const step = recording.steps[i] as RecordingStep;
      try {
        switch (step.type) {
          case 'setViewport':
            await page.setViewportSize({ width: step.width, height: step.height });
            results.push({ index: i, type: step.type, status: 'pass' });
            break;

          case 'navigate':
            await browser.navigate(step.url);
            visited.add(step.url);
            // capture title for downstream agents (e.g., test-case-writer)
            const title = await page.title();
            if (!context.navigationData) context.navigationData = {};
            context.navigationData[step.url] = { title };

            // simple assertion check if provided
            const assertedTitle = step.assertedEvents?.find(ev => ev.title)?.title;
            if (assertedTitle && title !== assertedTitle) {
              results.push({
                index: i,
                type: step.type,
                target: step.url,
                status: 'fail',
                message: `Expected title "${assertedTitle}" but saw "${title}"`
              });
            } else {
              results.push({ index: i, type: step.type, target: step.url, status: 'pass' });
            }
            break;

          case 'click': {
            const locator = await this.resolveLocator(page, step.selectors);
            if (!locator) {
              results.push({
                index: i,
                type: step.type,
                status: 'fail',
                message: 'No selector matched'
              });
              break;
            }
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

          default:
            results.push({ index: i, type: (step as any).type, status: 'fail', message: 'Unsupported step type' });
        }
      } catch (err: any) {
        results.push({ index: i, type: (step as any).type, status: 'fail', message: err.message });
        Logger.error(this.name, `Step ${i} failed`, err.message);
      }
    }

    // Persist run artifacts
    await StorageService.saveJson('recording-run.json', {
      title: recording.title,
      visited: Array.from(visited),
      results
    });

    // Make visited pages available to downstream agents (DOM extraction, test writer)
    if (visited.size) {
      context.pages = Array.from(new Set([...(context.pages || []), ...visited]));
    }

    // Emit quick regression cases derived from the recording
    const regression = this.buildRegressionCases(recording.title, recording.steps);
    await StorageService.saveJson('recording-regression.json', regression);
    await StorageService.saveFile('recording-regression.md', this.toMarkdown(regression), Config.OUTPUT_DIR);
    context.regressionCases = regression;

    Logger.info(this.name, `Replay complete: ${results.filter(r => r.status === 'pass').length}/${results.length} steps passed.`);
    return context;
  }

  private async loadRecording(context: AgentContext) {
    if (context.recordingSteps?.length) {
      return { title: context.recordingTitle || 'Context recording', steps: context.recordingSteps };
    }

    const fromDisk = await StorageService.loadJson('webrecorder.json', Config.OUTPUT_DIR);
    if (fromDisk?.steps?.length) return { title: fromDisk.title, steps: fromDisk.steps };
    if (Array.isArray(fromDisk)) return { title: 'webrecorder.json', steps: fromDisk };

    return { title: '', steps: [] };
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

  private buildRegressionCases(title: string | undefined, steps: RecordingStep[]): RegressionCase[] {
    const humanSteps = (steps as RecordingStep[]).map((s, idx) => {
      const t = s as any;
      if (t.type === 'navigate') return `(${idx + 1}) Navigate to ${t.url}`;
      if (t.type === 'click') {
        const hint = t.selectors?.[0]?.[0] || 'click target';
        return `(${idx + 1}) Click ${hint}`;
      }
      if (t.type === 'setViewport') return `(${idx + 1}) Set viewport to ${t.width}x${t.height}`;
      return `(${idx + 1}) ${t.type}`;
    });

    return [
      {
        id: 'REC-1',
        title: `Replay: ${title || 'recording flow'}`,
        steps: humanSteps,
        expected: 'Recording completes without errors; pages load and clicks perform the expected UI action.'
      }
    ];
  }

  private toMarkdown(cases: RegressionCase[]): string {
    const lines: string[] = ['# Recording Regression Cases', ''];
    for (const rc of cases) {
      lines.push(`- **${rc.id}** - ${rc.title}`);
      lines.push(`  - Steps: ${rc.steps.join(' -> ')}`);
      lines.push(`  - Expected: ${rc.expected}`);
      lines.push('');
    }
    return lines.join('\n');
  }
}
