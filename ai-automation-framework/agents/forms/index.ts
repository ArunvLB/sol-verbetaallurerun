import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { ParserService } from '../../services/parser';
import { BrowserService } from '../../services/browser';

export class FormAnalysisAgent extends BaseAgent {
  constructor() {
    super('FormAnalysisAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Analyzing forms on ${context.currentPage}...`);
    const browser = context.browser as BrowserService;
    
    const forms = await ParserService.extractForms(browser.page!);
    
    if (!context.formData) context.formData = {};
    context.formData[context.currentPage!] = forms;
    
    Logger.info(this.name, `Found ${forms.length} forms.`);
    return context;
  }
}
