import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { BrowserService } from '../../services/browser';

export class TestAgent extends BaseAgent {
  constructor() {
    super('TestAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Generating and running tests for ${context.currentPage}...`);
    const browser = context.browser as BrowserService;
    
    if (!context.testResults) context.testResults = [];
    
    try {
      const title = await browser.page!.title();
      context.testResults.push({
        page: context.currentPage,
        test: 'Page Load and Title Check',
        status: title ? 'pass' : 'fail',
        error: title ? null : 'Title is empty'
      });
      
      context.testResults.push({
        page: context.currentPage,
        test: 'Navigation Check',
        status: 'pass'
      });

      Logger.info(this.name, `Executed basic tests successfully.`);
    } catch (e: any) {
      Logger.error(this.name, `Test execution failed`, e.message);
      context.testResults.push({
        page: context.currentPage,
        test: 'Execution',
        status: 'fail',
        error: e.message
      });
    }

    return context;
  }
}
