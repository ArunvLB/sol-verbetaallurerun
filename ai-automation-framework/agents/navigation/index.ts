import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { BrowserService } from '../../services/browser';

export class NavigationAgent extends BaseAgent {
  constructor() {
    super('NavigationAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Mapping navigation for ${context.currentPage}...`);
    const browser = context.browser as BrowserService;
    
    if (!context.navigationData) context.navigationData = {};
    
    const url = browser.page!.url();
    const title = await browser.page!.title();
    
    context.navigationData[context.currentPage!] = { url, title };
    Logger.info(this.name, `Mapped navigation state for ${title} (${url})`);
    
    return context;
  }
}
