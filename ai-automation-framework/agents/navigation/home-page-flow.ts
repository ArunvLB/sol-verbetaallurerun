import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { BrowserService } from '../../services/browser';
import { ParserService } from '../../services/parser';
import { StorageService } from '../../services/storage';
import { Page, Locator, Download } from 'playwright';

type FlowStatus = 'pass' | 'fail' | 'skip';

interface FlowStepResult {
  step: string;
  status: FlowStatus;
  details?: string;
}

export class HomePageFlowAgent extends BaseAgent {
  constructor() {
    super('HomePageFlowAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    const browser = context.browser as BrowserService;
    const page = browser.page as Page;

    if (!context.url || context.currentPage !== context.url) {
      Logger.info(this.name, 'Skipping home flow (not on base URL).');
      return context;
    }

    Logger.step(this.name, 'Running curated home page journey...');
    const results: FlowStepResult[] = [];
    const record = (step: string, status: FlowStatus, details?: string) => {
      results.push({ step, status, details });
      Logger.info(this.name, `${step} -> ${status}${details ? ` (${details})` : ''}`);
      if (!context.testResults) context.testResults = [];
      context.testResults.push({
        page: context.currentPage,
        test: `Home Flow: ${step}`,
        status: status === 'pass' ? 'pass' : 'fail',
        error: status === 'pass' ? undefined : details
      });
    };

    const scrollToText = async (text: string, step: string) => {
      const locator = page.getByText(text, { exact: false }).first();
      try {
        // Progressive scroll until element appears (handles lazy-loaded sections)
        for (let i = 0; i < 8; i++) {
          try {
            await locator.waitFor({ timeout: 1200 });
            break;
          } catch {
            await page.evaluate((y) => window.scrollBy(0, y), 800);
            await page.waitForTimeout(400);
          }
        }
        await locator.scrollIntoViewIfNeeded({ timeout: 25000 });
        await page.waitForTimeout(500);
        record(step, 'pass');
        return locator;
      } catch (e1: any) {
        // Fallback: query manually for partial text and scroll it into view
        try {
          const handle = await page.evaluateHandle((needle) => {
            const all = Array.from(document.querySelectorAll('h1, h2, h3, p, div, span'));
            return all.find(el => (el.textContent || '').toLowerCase().includes(needle.toLowerCase())) || null;
          }, text);
          const found = handle.asElement();
          if (found) {
            await found.scrollIntoViewIfNeeded?.();
            await page.waitForTimeout(500);
            record(step, 'pass', 'Found via fallback search');
            return page.getByText(text, { exact: false }).first();
          }
        } catch {}
        record(step, 'fail', e1.message);
        return null;
      }
    };

    const playYoutubeIfPresent = async () => {
      try {
        const iframeLocator = page.locator('iframe[src*=\"youtube\"], iframe[src*=\"youtu\"]');
        const frameCount = await iframeLocator.count();
        if (frameCount === 0) {
          record('Play video', 'skip', 'No YouTube iframe found');
          return;
        }

        const frame = page.frameLocator('iframe[src*=\"youtube\"], iframe[src*=\"youtu\"]').first();
        const playButton = frame.locator('button[aria-label*=\"Play\"], .ytp-large-play-button');
        if ((await playButton.count()) > 0) {
          await playButton.first().click({ timeout: 10000 });
          record('Play video', 'pass', 'Started playback via play button');
        } else {
          await frame.locator('body').click({ position: { x: 32, y: 32 }, timeout: 10000 });
          record('Play video', 'pass', 'Tapped iframe body to start playback');
        }

        // Wait 3 minutes 21 seconds to match requirement
        await page.waitForTimeout(201000);
        record('Watch video', 'pass', 'Waited 3m 21s');
      } catch (e: any) {
        record('Play video', 'fail', e.message);
      }
    };

    const findFirstLocator = async (candidates: Locator[]): Promise<Locator | null> => {
      for (const locator of candidates) {
        if ((await locator.count()) > 0) return locator;
      }
      return null;
    };

    const clickIfAvailable = async (locator: Locator | null, step: string) => {
      try {
        if (!locator) {
          record(step, 'skip', 'Element not found');
          return;
        }
        const maybeDownload = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await locator.first().click({ timeout: 15000 });
        const download: Download | null = await maybeDownload;
        if (download) {
          const savePath = await download.path();
          record(step, 'pass', savePath ? `Downloaded to ${savePath}` : 'Download triggered');
        } else {
          record(step, 'pass');
        }
      } catch (e: any) {
        record(step, 'fail', e.message);
      }
    };

    await scrollToText('Empowering Supply Chain and Value Chain Excellence', 'Hero: Empowering Supply Chain and Value Chain Excellence');
    await scrollToText('Current Ecosystem Challenges', 'Section: Current Ecosystem Challenges');
    await playYoutubeIfPresent();
    await scrollToText('Building Interconnected Ecosystems for the Future', 'Section: Building Interconnected Ecosystems for the Future');
    await scrollToText('Seamless Access to the Mobility Aftermarket', 'Section: Seamless Access to the Mobility Aftermarket');
    await scrollToText('Vehicle Digital Inspection', 'Section: Vehicle Digital Inspection');

    const impactLocator = await scrollToText('Customer and Business Impact', 'Section: Customer and Business Impact');
    if (impactLocator) {
      const downloadLocator = await findFirstLocator([
        page.getByRole('link', { name: /download.*broch/i }).first(),
        page.getByRole('button', { name: /download.*broch/i }).first(),
        page.getByText(/download.*broch/i).first()
      ]);
      await clickIfAvailable(downloadLocator, 'Action: Download brochure');
    }

    await scrollToText('Digital Solutions for Sustainable Growth', 'Section: Digital Solutions for Sustainable Growth');
    await scrollToText('Quantifiable Growth', 'Section: Quantifiable Growth');

    const newsLocator = await findFirstLocator([
      page.getByRole('link', { name: /view all news/i }).first(),
      page.getByRole('button', { name: /view all news/i }).first(),
      page.getByText(/view all news/i).first()
    ]);
    await scrollToText('Latest News', 'Section: Latest News');
    await clickIfAvailable(newsLocator, 'Action: View all news');

    const blogsLocator = await findFirstLocator([
      page.getByRole('link', { name: /view all blogs/i }).first(),
      page.getByRole('button', { name: /view all blogs/i }).first(),
      page.getByText(/view all blogs/i).first()
    ]);
    await scrollToText('Recent Blogs', 'Section: Recent Blogs');
    await clickIfAvailable(blogsLocator, 'Action: View all blogs');

    try {
      await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
      await page.waitForTimeout(1500);
      record('Scroll bottom', 'pass');
    } catch (e: any) {
      record('Scroll bottom', 'fail', e.message);
    }

    try {
      const topButton = await findFirstLocator([
        page.getByRole('button', { name: /top/i }).first(),
        page.getByText(/back to top|top/i).first()
      ]);
      if (topButton) {
        await topButton.click({ timeout: 10000 });
        await page.waitForTimeout(800);
        record('Action: Back to top', 'pass');
      } else {
        record('Action: Back to top', 'skip', 'Top button not found');
      }
    } catch (e: any) {
      record('Action: Back to top', 'fail', e.message);
    }

    // Capture full text inventory for the home page
    try {
      const allText = await ParserService.extractAllTextContents(page);
      context.homePageText = allText;
      await StorageService.saveJson('home_page_text.json', allText);
      record('Capture: All text content', 'pass', `Captured ${allText.length} entries`);
    } catch (e: any) {
      record('Capture: All text content', 'fail', e.message);
    }

    context.homePageFlow = results;
    return context;
  }
}
