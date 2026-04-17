import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { ParserService } from '../../services/parser';
import { BrowserService } from '../../services/browser';

export class PageDiscoveryAgent extends BaseAgent {
  constructor() {
    super('PageDiscoveryAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Discovering pages...');
    const browser = context.browser as BrowserService;
    if (!browser.page) throw new Error('Browser page not available');
    
    // Make sure to await navigation to base URL if not already there
    if (browser.page.url() === 'about:blank' && context.url) {
      await browser.navigate(context.url);
    }

    const links = await ParserService.extractLinks(browser.page);
    
    // Always include the base URL first, then unique discovered links.
    const allLinks = Array.from(new Set([context.url!, ...links]));
    
    Logger.info(this.name, `Found ${allLinks.length} total links including external domains (home included).`);
    
    context.pages = allLinks;
    return context;
  }
}
