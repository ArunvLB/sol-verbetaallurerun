import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { BrowserService } from '../../services/browser';
import { StorageService } from '../../services/storage';

import { PageDiscoveryAgent } from '../discovery';
import { DomExtractionAgent } from '../dom';
import { NavigationAgent } from '../navigation';
import { InteractionAgent } from '../interaction';
import { FormAnalysisAgent } from '../forms';
import { IntegrationAgent } from '../integration';
import { TestCaseWriterAgent } from '../test-case-writer';
import { SeleniumTestExecutionAgent } from '../selenium-execution';
import { TestAgent } from '../test';
import { ReportAgent } from '../report';
import { AllureReportAgent } from '../allure';
import { PresentationBuilderAgent } from '../presentation';
import { MediaAgent } from '../media';
import { SlideDesignerAgent } from '../slide-designer';
import { NarrationAgent } from '../narration';
import { HomePageFlowAgent } from '../navigation/home-page-flow';
import { ClickAgent } from '../dom/click-agent';
import { RecordingReplayAgent } from '../recording-replay';
import { FlowExecutionAgent } from '../flow-execution';
import { RecordingBuilderAgent } from '../recording-builder';

// Phase-3 agents
import { ExportAgent } from '../export';
import { AnalyticsAgent } from '../analytics';
import { SelfHealingAgent } from '../self-healing';
import { VoiceAgent } from '../voice';


export class OrchestratorAgent extends BaseAgent {
  constructor() {
    super('OrchestratorAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, `Starting automation pipeline for ${context.url}`);
    
    await StorageService.ensureDirs();
    const browser = new BrowserService();
    await browser.init();
    context.browser = browser;

    try {
      // Optional: execute a provided happy-path flow and capture a recording.
      if (context.flowScript?.length) {
        try {
          const flowExec = new FlowExecutionAgent();
          await flowExec.execute(context);
        } catch (e: any) {
          Logger.error(this.name, 'FlowExecutionAgent failed (continuing pipeline)', e.message);
        }
      } else {
        // Otherwise, replay an existing recording if present.
        try {
          const replay = new RecordingReplayAgent();
          await replay.execute(context);
        } catch (e: any) {
          Logger.error(this.name, 'RecordingReplayAgent failed (continuing pipeline)', e.message);
        }
      }

      // If no base URL was provided but recording produced pages, seed the first page as base.
      if (!context.url && context.pages?.length) {
        context.url = context.pages[0];
      }

      const discovery = new PageDiscoveryAgent();
      await discovery.execute(context);

      // Persist an auto-generated navigation recording for regression reuse.
      try {
        const recBuilder = new RecordingBuilderAgent();
        await recBuilder.execute(context);
      } catch (e: any) {
        Logger.error(this.name, 'RecordingBuilderAgent failed (continuing pipeline)', e.message);
      }

      const pages = context.pages || [context.url!];
      
      for (const pageUrl of pages) {
        try {
          Logger.step(this.name, `Processing page: ${pageUrl}`);
          context.currentPage = pageUrl;
          
          await browser.navigate(pageUrl);
          
          const agents = [
            new HomePageFlowAgent(),
            new DomExtractionAgent(),
            new ClickAgent(),
            new InteractionAgent(),
            new NavigationAgent(),
            new FormAnalysisAgent(),
            new IntegrationAgent(),
            new TestCaseWriterAgent(),
            new SeleniumTestExecutionAgent(),
            new TestAgent(),
            new MediaAgent()
          ];
          
          for (const agent of agents) {
            await agent.execute(context);
          }
        } catch (err: any) {
          Logger.error(this.name, `Failed processing page ${pageUrl}`, err.message);
        }
      }
      
      const report = new ReportAgent();
      await report.execute(context);

      const allure = new AllureReportAgent();
      await allure.execute(context);
      
      const presentation = new PresentationBuilderAgent();
      await presentation.execute(context);

      // Phase-2: Design slides and generate narration
      const slideDesigner = new SlideDesignerAgent();
      await slideDesigner.execute(context);

      const narration = new NarrationAgent();
      await narration.execute(context);

      // Phase-3: Enterprise extensions (run independently, do not affect P1/P2)
      try {
        const analytics = new AnalyticsAgent();
        await analytics.execute(context);
      } catch (e: any) { Logger.error(this.name, 'AnalyticsAgent failed', e.message); }

      try {
        const selfHealing = new SelfHealingAgent();
        await selfHealing.execute(context);
      } catch (e: any) { Logger.error(this.name, 'SelfHealingAgent failed', e.message); }

      try {
        const exporter = new ExportAgent();
        await exporter.execute(context);
      } catch (e: any) { Logger.error(this.name, 'ExportAgent failed', e.message); }

      try {
        const voice = new VoiceAgent();
        await voice.execute(context);
      } catch (e: any) { Logger.error(this.name, 'VoiceAgent failed', e.message); }

    } catch (e: any) {
      Logger.error(this.name, 'Pipeline failed', e.message);
    } finally {
      await browser.close();
      Logger.info(this.name, 'Pipeline completed successfully.');
    }
    
    return context;
  }
}
