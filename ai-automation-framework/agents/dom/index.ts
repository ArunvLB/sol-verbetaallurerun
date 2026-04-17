import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { ParserService } from '../../services/parser';
import { BrowserService } from '../../services/browser';

export class DomExtractionAgent extends BaseAgent {
  constructor() {
    super('DomExtractionAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Extracting DOM for ${context.currentPage}...`);
    const browser = context.browser as BrowserService;
    
    const buttons = await ParserService.extractButtons(browser.page!);
    const textContents = await ParserService.extractTextContents(browser.page!);
    
    if (!context.domData) context.domData = {};
    context.domData[context.currentPage!] = { buttons, textContents };
    
    Logger.info(this.name, `Extracted ${buttons.length} buttons and ${textContents.length} text elements.`);
    return context;
  }
}
