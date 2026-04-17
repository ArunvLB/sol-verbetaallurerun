import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';

export class ReportAgent extends BaseAgent {
  constructor() {
    super('ReportAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Generating automation report...');
    
    const summary = {
      totalTests: context.testResults?.length || 0,
      passed: context.testResults?.filter((r: any) => r.status === 'pass').length || 0,
      failed: context.testResults?.filter((r: any) => r.status === 'fail').length || 0,
      pagesScanned: context.pages?.length || 0,
      testCasesDesigned: context.testCases?.length || 0
    };
    
    const failures = context.testResults?.filter((r: any) => r.status === 'fail') || [];
    const caseCounts = (context.testCases || []).reduce((acc: Record<string, number>, tc: any) => {
      acc[tc.type] = (acc[tc.type] || 0) + 1;
      return acc;
    }, {});
    
    const reportData = {
      summary,
      failures,
      screenshots: context.screenshots || [],
      extractedData: {
        dom: context.domData,
        forms: context.formData,
        integrations: context.integrationData,
        homePageText: context.homePageText
      },
      flows: {
        homePage: context.homePageFlow
      },
      testCases: {
        total: context.testCases?.length || 0,
        byType: caseCounts,
        cases: context.testCases || []
      }
    };
    if (context.clickResults) {
      (reportData as any).clickResults = context.clickResults;
    }
    
    await StorageService.saveJson('results.json', reportData);
    Logger.info(this.name, 'Report saved to results.json');

    const txtOutput = this.generateTxtReport(context);
    await StorageService.saveFile('agent_discoveries.txt', txtOutput, Config.OUTPUT_DIR);
    Logger.info(this.name, 'Discoveries report saved to agent_discoveries.txt');

    return context;
  }

  private generateTxtReport(context: AgentContext): string {
    let out = `==================================================\n`;
    out += `AI Automation Framework - Agent Discovery Report\n`;
    out += `Website: ${context.url}\n`;
    out += `==================================================\n\n`;

    out += `1. PAGE DISCOVERY AGENT\n-----------------------\n`;
    out += `Pages discovered and mapped for analysis: ${context.pages?.length || 0}\n`;
    context.pages?.forEach((p: string, i: number) => out += `  ${i+1}. ${p}\n`);
    out += `\n`;

    out += `2. NAVIGATION AGENT\n-------------------\n`;
    out += `Captured routing states:\n`;
    if (context.navigationData) {
      for (const [url, data] of Object.entries(context.navigationData)) {
        out += `- Title for ${url}: "${(data as any).title}"\n`;
      }
    }
    out += `\n`;

    out += `3. DOM EXTRACTION AGENT\n-----------------------\n`;
    if (context.domData) {
      for (const [url, data] of Object.entries(context.domData)) {
        const d = data as any;
        out += `- On ${url}: ${d.buttons?.length || 0} buttons, ${d.textContents?.length || 0} text headings.\n`;
      }
    }
    out += `\n`;

    out += `4. FORM ANALYSIS AGENT\n----------------------\n`;
    if (context.formData) {
      for (const [url, forms] of Object.entries(context.formData)) {
        const fArray = forms as any[];
        out += `- On ${url}: ${fArray?.length || 0} forms\n`;
        fArray?.forEach(f => {
          out += `  -> Inputs: ${f.inputs?.map((i: any) => i.name).join(', ')}\n`;
        });
      }
    }
    out += `\n`;

    out += `5. INTEGRATION AGENT\n--------------------\n`;
    if (context.integrationData) {
      for (const [url, integrations] of Object.entries(context.integrationData)) {
        const iData = integrations as any;
        out += `- On ${url}: ${iData.iframes?.length || 0} iframes, ${iData.scripts?.length || 0} external scripts.\n`;
      }
    }
    out += `\n`;

    out += `6. TEST CASE WRITER AGENT\n-------------------------\n`;
    if (context.testCases?.length) {
      const countByType = (context.testCases as any[]).reduce((acc: Record<string, number>, tc: any) => {
        acc[tc.type] = (acc[tc.type] || 0) + 1;
        return acc;
      }, {});
      out += `- Total test cases designed: ${context.testCases.length}\n`;
      out += `- Breakdown: positive=${countByType['positive'] || 0}, negative=${countByType['negative'] || 0}, edge=${countByType['edge'] || 0}\n`;
    } else {
      out += `- No generated test cases recorded.\n`;
    }
    out += `\n`;

    out += `7. TEST AGENT\n-------------\n`;
    out += `- Total tests executed: ${context.testResults?.length || 0}\n`;
    out += `- Passed: ${context.testResults?.filter((r: any) => r.status === 'pass').length || 0}\n`;
    out += `- Failed: ${context.testResults?.filter((r: any) => r.status === 'fail').length || 0}\n\n`;

    out += `8. MEDIA AGENT\n--------------\n`;
    if (context.screenshots) {
      out += `- Screenshots captured:\n`;
      context.screenshots.forEach((s: any) => {
        out += `  -> ${s.path}\n`;
      });
    }
    out += `\n`;

    out += `9. REPORT & PRESENTATION AGENTS\n-------------------------------\n`;
    out += `- Generated results.json\n- Generated presentation.json\n- Generated agent_discoveries.txt\n\n`;

    if (context.homePageFlow || context.homePageText) {
      out += `10. HOME PAGE FLOW AGENT\n-----------------------\n`;
      if (context.homePageFlow) {
        (context.homePageFlow as any[]).forEach((step: any) => {
          out += `- ${step.step}: ${step.status}${step.details ? ` (${step.details})` : ''}\n`;
        });
      }
      if (context.homePageText) {
        out += `- Captured text nodes on home: ${(context.homePageText as any[]).length}\n`;
      }
      out += `\n`;
    }

    if (context.clickResults) {
      out += `11. CLICK AGENT (sampled clickable elements)\n-------------------------------------------\n`;
      for (const [url, clicks] of Object.entries(context.clickResults)) {
        out += `- ${url}: ${(clicks as any[]).length} clicks tried\n`;
        (clicks as any[]).forEach((c: any, idx: number) => {
          out += `  ${idx + 1}. ${c.element} "${c.text}" -> ${c.navigated ? 'navigated' : 'no nav'}; pre: ${c.preUrl}; post: ${c.postUrl}${c.error ? `; error: ${c.error}` : ''}\n`;
        });
      }
      out += `\n`;
    }

    out += `==================================================\n`;
    out += `END OF REPORT\n`;
    out += `==================================================\n`;
    
    return out;
  }
}
