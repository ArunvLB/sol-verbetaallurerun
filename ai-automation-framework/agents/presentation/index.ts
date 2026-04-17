import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';

export class PresentationBuilderAgent extends BaseAgent {
  constructor() {
    super('PresentationBuilderAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Building presentation JSON...');
    
    const summaryStats = context.testResults ? `Total Tests: ${context.testResults.length}` : 'N/A';

    // Core slides stay unchanged for downstream agents
    const slides: any[] = [
      { title: 'Overview', content: `Automated testing for ${context.url}` },
      { title: 'Coverage', content: `Pages discovered and mapped: ${context.pages?.length || 0}` },
      { title: 'Results', content: summaryStats }
    ];

    // Per-page slides so every page is reported and presented
    const pages = context.pages || [];
    for (const pageUrl of pages) {
      const nav = context.navigationData?.[pageUrl];
      const dom = context.domData?.[pageUrl];
      const forms = context.formData?.[pageUrl] || [];
      const integrations = context.integrationData?.[pageUrl] || { iframes: [], scripts: [] };
      const testsForPage = (context.testResults || []).filter((t: any) => t.page === pageUrl);

      slides.push({
        title: `Page: ${nav?.title || pageUrl}`,
        page: pageUrl,
        bullets: [
          `URL: ${pageUrl}`,
          `Buttons: ${dom?.buttons?.length || 0}, Headings: ${dom?.textContents?.length || 0}`,
          `Forms: ${forms.length}, Integrations: ${integrations.iframes?.length || 0} iframes / ${integrations.scripts?.length || 0} scripts`,
          `Tests: ${testsForPage.length || 0} run`,
        ]
      });
    }

    const presentation = { slides };
    
    await StorageService.saveJson('presentation.json', presentation);
    Logger.info(this.name, 'Presentation saved to presentation.json');
    return context;
  }
}
