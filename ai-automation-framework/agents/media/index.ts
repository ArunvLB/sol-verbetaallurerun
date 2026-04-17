import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { BrowserService } from '../../services/browser';

export class MediaAgent extends BaseAgent {
  constructor() {
    super('MediaAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Capturing media for ${context.currentPage}...`);
    const browser = context.browser as BrowserService;
    
    if (!context.screenshots) context.screenshots = [];
    
    const safeName = context.currentPage!.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const screenshotPath = await browser.takeScreenshot(`screenshot_${safeName}`);
    
    context.screenshots.push({
      page: context.currentPage,
      path: screenshotPath
    });
    
    Logger.info(this.name, `Screenshot saved to ${screenshotPath}`);
    return context;
  }
}
