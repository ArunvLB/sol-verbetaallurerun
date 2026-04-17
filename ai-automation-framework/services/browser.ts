import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../core/logger';
import { Config } from '../core/config';

export class BrowserService {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  public page: Page | null = null;

  async init() {
    Logger.info('BrowserService', 'Initializing browser...');
    try {
      // Prefer system Chrome if available (helps in restricted environments).
      this.browser = await chromium.launch({ channel: 'chrome', headless: false });
    } catch (e) {
      Logger.warn('BrowserService', 'Chrome channel launch failed, falling back to bundled chromium');
      this.browser = await chromium.launch({ headless: false });
    }
    this.context = await this.browser.newContext({
      recordVideo: { dir: Config.VIDEOS_DIR }
    });
    this.page = await this.context.newPage();
    return this.page;
  }

  async close() {
    Logger.info('BrowserService', 'Closing browser...');
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  async navigate(url: string) {
    if (!this.page) throw new Error('Browser not initialized');
    Logger.info('BrowserService', `Navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'networkidle' });
  }

  async takeScreenshot(name: string): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');
    const path = `${Config.SCREENSHOTS_DIR}/${name}.png`;
    await this.page.screenshot({ path, fullPage: true });
    return path;
  }
}
