import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { BrowserService } from '../../services/browser';

export class IntegrationAgent extends BaseAgent {
  constructor() {
    super('IntegrationAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Detecting integrations on ${context.currentPage}...`);
    const browser = context.browser as BrowserService;
    
    const integrations = await browser.page!.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map(i => i.src);
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean);
      return { iframes, scripts };
    });
    
    if (!context.integrationData) context.integrationData = {};
    context.integrationData[context.currentPage!] = integrations;
    
    Logger.info(this.name, `Found ${integrations.iframes.length} iframes and ${integrations.scripts.length} external scripts.`);
    return context;
  }
}
