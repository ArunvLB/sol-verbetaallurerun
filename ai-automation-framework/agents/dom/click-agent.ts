import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { BrowserService } from '../../services/browser';

interface ClickResult {
  element: string;
  text: string;
  href?: string;
  preUrl: string;
  postUrl: string;
  navigated: boolean;
  error?: string;
  log?: string;
}

/**
 * ClickAgent — lightweight click walkthrough that samples clickable elements,
 * attempts a click, reports issues, and restores the page to avoid side effects.
 * Designed as an add-on so it won't break previous flows.
 */
export class ClickAgent extends BaseAgent {
  constructor() {
    super('ClickAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Sampling click interactions on ${context.currentPage}...`);
    const browser = context.browser as BrowserService;
    const page = browser.page!;

    if (!context.clickResults) context.clickResults = {};
    const results: ClickResult[] = [];
    const viewportHeight = page.viewportSize()?.height ?? 900;

    // Limit to a reasonable number to keep runs fast and non-disruptive.
    const candidates = page.locator('a[href]:visible, button:visible, [role="button"]:visible').filter({ hasText: /./ });
    const total = await candidates.count();
    const maxSamples = Math.min(total, 5);
    const seenKeys = new Set<string>();

    for (let i = 0; i < maxSamples; i++) {
      const locator = candidates.nth(i);
      const elementInfo = await this.describe(locator);
      if (elementInfo.href?.startsWith('#') || elementInfo.element === 'a' && elementInfo.text.toLowerCase().includes('skip to content')) {
        continue; // skip offscreen/internal skip links
      }
      const box = await locator.boundingBox().catch(() => null);
      if (!box || box.width < 4 || box.height < 4 || box.y > viewportHeight + 150 || box.y + box.height < -150) {
        continue; // ignore tiny/off-viewport elements to avoid repeat timeouts
      }
      const dedupeKey = `${elementInfo.element}-${elementInfo.text}-${elementInfo.href || ''}`.toLowerCase();
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);
      const preUrl = page.url();
      const preTitle = await page.title();

      try {
        const navPromise = page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => null);
        const popupPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);

        await locator.click({ timeout: 5000 });
        const nav = await navPromise;
        const popup = await popupPromise;

        let postUrl = page.url();
        let navigated = !!nav;
        let log = '';

        if (popup) {
          postUrl = popup.url();
          navigated = true;
          await popup.close().catch(() => {});
        }

        // Immediate URL check after click (even if no nav event fired)
        if (!navigated && postUrl !== preUrl) {
          navigated = true;
          log = 'URL changed without navigation event';
        }

        results.push({
          ...elementInfo,
          preUrl,
          postUrl,
          navigated,
          log
        });

        // Restore original page if navigation happened
        if (navigated && page.url() !== preUrl) {
          await page.goBack({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(500);
          Logger.info(this.name, `Reverted to ${preUrl} after navigation triggered by click on "${elementInfo.text}"`);
        }
      } catch (e: any) {
        results.push({
          ...elementInfo,
          preUrl,
          postUrl: page.url(),
          navigated: page.url() !== preUrl,
          error: e.message
        });
        // Attempt recovery to original page
        if (page.url() !== preUrl) {
          await page.goBack({ waitUntil: 'networkidle', timeout: 8000 }).catch(() => {});
          await page.waitForTimeout(500);
          Logger.warn(this.name, `Recovered to ${preUrl} after failed click on "${elementInfo.text}"`);
        }
        Logger.warn(this.name, `Click failed on ${elementInfo.element}: ${e.message}`);
      } finally {
        // Brief pause to let UI settle
        await page.waitForTimeout(300);
      }

      // If title/url changed without explicit navigation, log it
      const postTitle = await page.title().catch(() => preTitle);
      if (postTitle !== preTitle && !results[results.length - 1].navigated) {
        results[results.length - 1].navigated = true;
        results[results.length - 1].log = (results[results.length - 1].log || '') + ' Title changed after click.';
      }
    }

    context.clickResults[context.currentPage!] = results;
    Logger.info(this.name, `Click samples executed: ${results.length}/${Math.min(total, maxSamples)}`);
    return context;
  }

  private async describe(locator: any): Promise<{ element: string; text: string; href?: string }> {
    const tag = await locator.evaluate((el: HTMLElement) => el.tagName.toLowerCase()).catch(() => 'unknown');
    const text = await locator.innerText().catch(() => '');
    const href = await locator.getAttribute('href').catch(() => undefined);
    return { element: tag, text: text.trim(), href: href || undefined };
  }
}
