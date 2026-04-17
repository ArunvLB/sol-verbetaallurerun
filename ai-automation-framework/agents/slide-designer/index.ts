import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';

export interface DesignedSlide {
  index: number;
  title: string;
  layout: 'title-only' | 'title-bullets' | 'title-image' | 'title-bullets-image';
  bullets: string[];
  media: string[];
  badge?: string; // e.g. PASS / FAIL / INFO
}

export class SlideDesignerAgent extends BaseAgent {
  constructor() {
    super('SlideDesignerAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Designing structured slides from presentation data...');

    const presentation = await StorageService.loadJson('presentation.json', Config.OUTPUT_DIR);
    const results = await StorageService.loadJson('results.json', Config.OUTPUT_DIR);

    const screenshots: string[] = (results?.screenshots || []).map((s: any) => s.path);
    const rawSlides = presentation?.slides || [];
    const failures = results?.failures || [];
    const summary = results?.summary || {};

    const designedSlides: DesignedSlide[] = [];
    const addSlide = (slide: Omit<DesignedSlide, 'index'>) => {
      designedSlides.push({ ...slide, index: designedSlides.length });
    };

    // Slide 1: Title slide (Overview)
    const overviewSlide = rawSlides.find((s: any) => s.title === 'Overview');
    addSlide({
      title: 'Overview',
      layout: 'title-bullets',
      badge: 'INFO',
      bullets: [
        overviewSlide?.content || '',
        `Run Date: ${new Date().toLocaleDateString()}`,
        `Total Pages Scanned: ${summary.pagesScanned || 0}`,
      ].filter(Boolean),
      media: [],
    });

    // Slide 2: Coverage
    const domData = results?.extractedData?.dom || {};
    const pageNames = Object.keys(domData);
    const coverageBullets = pageNames.slice(0, 5).map((url: string) => {
      const d = domData[url];
      return `${url.replace(/https?:\/\/[^/]+/, '') || '/'}: ${d.buttons?.length || 0} buttons, ${d.textContents?.length || 0} headings`;
    });

    addSlide({
      title: 'Coverage',
      layout: coverageBullets.length ? 'title-bullets' : 'title-only',
      badge: 'INFO',
      bullets: coverageBullets,
      media: screenshots.slice(0, 1),
    });

    // Slides 3..N: Per-page deep dives (one per discovered page)
    const pageSlides = rawSlides.filter((s: any) => s.page || (typeof s.title === 'string' && s.title.startsWith('Page:')));
    for (const slide of pageSlides) {
      const pageUrl = slide.page || (slide.title || '').replace(/^Page:\s*/, '');
      const short = pageUrl.replace(/https?:\/\/[^/]+/, '') || '/';
      const dom = domData[pageUrl] || {};
      const forms = (results?.extractedData?.forms?.[pageUrl]) || [];
      const integrations = (results?.extractedData?.integrations?.[pageUrl]) || { iframes: [], scripts: [] };
      const pageFails = failures.filter((f: any) => f.page === pageUrl);
      const pageScreens = (results?.screenshots || []).filter((s: any) => s.page === pageUrl).map((s: any) => s.path);

      const bullets = slide.bullets && slide.bullets.length
        ? slide.bullets
        : [
            `Path: ${short}`,
            `Buttons: ${dom.buttons?.length || 0}, Headings: ${dom.textContents?.length || 0}`,
            `Forms: ${forms.length}, Integrations: ${integrations.iframes?.length || 0} iframes / ${integrations.scripts?.length || 0} scripts`,
            pageFails.length ? `Failures: ${pageFails.length}` : 'Failures: 0',
          ];

      addSlide({
        title: slide.title || `Page: ${short}`,
        layout: pageScreens.length ? 'title-bullets-image' : 'title-bullets',
        badge: pageFails.length ? 'FAIL' : 'INFO',
        bullets,
        media: pageScreens.slice(0, 2),
      });
    }

    // Slide 3: Integrations & Forms
    const integrations = results?.extractedData?.integrations || {};
    const forms = results?.extractedData?.forms || {};
    const intBullets: string[] = [];
    for (const [url, data] of Object.entries(integrations)) {
      const d = data as any;
      if (d.iframes?.length || d.scripts?.length) {
        const short = url.replace(/https?:\/\/[^/]+/, '') || '/';
        intBullets.push(`${short}: ${d.iframes?.length || 0} iframes, ${d.scripts?.length || 0} scripts`);
      }
    }
    const formCount = Object.values(forms).filter((f: any) => f?.length > 0).length;
    intBullets.unshift(`Forms with inputs detected: ${formCount}`);

    addSlide({
      title: 'Integrations & Forms',
      layout: 'title-bullets',
      badge: 'INFO',
      bullets: intBullets.slice(0, 5),
      media: [],
    });

    // Slide 4: Test Results
    const passed = summary.passed || 0;
    const failed = summary.failed || 0;
    const total = summary.totalTests || 0;
    const passRate = total ? `${((passed / total) * 100).toFixed(1)}%` : 'N/A';

    addSlide({
      title: 'Test Results',
      layout: failed > 0 ? 'title-bullets-image' : 'title-bullets',
      badge: failed > 0 ? 'FAIL' : 'PASS',
      bullets: [
        `Total Tests: ${total}`,
        `Passed: ${passed}`,
        `Failed: ${failed}`,
        `Pass Rate: ${passRate}`,
      ],
      media: failed > 0 ? screenshots.slice(0, 2) : [],
    });

    // Slide 5: Failures (if any)
    if (failures.length > 0) {
      const failureBullets = failures.slice(0, 5).map((f: any) => `${f.page}: ${f.test} - ${f.error || 'Error'}`);
      const failScreenshots = (results?.screenshots || [])
        .filter((s: any) => failures.some((f: any) => f.page === s.page))
        .map((s: any) => s.path);

      addSlide({
        title: 'Failures',
        layout: failScreenshots.length ? 'title-bullets-image' : 'title-bullets',
        badge: 'FAIL',
        bullets: failureBullets,
        media: failScreenshots.slice(0, 2),
      });
    }

    // Slide 6: Screenshots summary
    addSlide({
      title: 'Visual Captures',
      layout: screenshots.length ? 'title-bullets-image' : 'title-only',
      badge: 'INFO',
      bullets: screenshots.slice(0, 5).map((p: string) => p.split(/[/\\]/).pop() || p),
      media: screenshots.slice(0, 2),
    });

    context.designedSlides = designedSlides;
    await StorageService.saveJson('designed-slides.json', designedSlides, Config.OUTPUT_DIR);
    Logger.info(this.name, `Designed ${designedSlides.length} slides → designed-slides.json`);

    return context;
  }
}
