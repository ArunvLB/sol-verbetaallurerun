import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';

type CaseType = 'positive' | 'negative' | 'edge';

interface TestCaseRecord {
  id: string;
  page: string;
  category: string;
  type: CaseType;
  title: string;
  steps: string[];
  expected: string;
  data?: Record<string, any>;
}

export class TestCaseWriterAgent extends BaseAgent {
  constructor() {
    super('TestCaseWriterAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Designing test cases from crawl artifacts...');
    const pages = context.pages?.length ? context.pages : (context.url ? [context.url] : []);

    if (!pages.length) {
      Logger.warn(this.name, 'No pages to design test cases for.');
      return context;
    }

    const cases: TestCaseRecord[] = [];
    let seq = 1;

    for (const [pageIndex, pageUrl] of pages.entries()) {
      const nav = context.navigationData?.[pageUrl];
      seq = this.addNavigationCases(pageUrl, nav, cases, seq);

      const domEntry = context.domData?.[pageUrl];
      seq = this.addButtonCases(pageUrl, domEntry?.buttons, cases, seq);
      seq = this.addContentEdgeCases(pageUrl, domEntry?.textContents, cases, seq);

      const forms = context.formData?.[pageUrl];
      seq = this.addFormCases(pageUrl, forms, cases, seq);

      const integrations = context.integrationData?.[pageUrl];
      seq = this.addIntegrationCases(pageUrl, integrations, cases, seq);
    }

    context.testCases = cases;

    await StorageService.saveJson('test-cases.json', cases);
    await StorageService.saveFile('test-cases.md', this.toMarkdown(cases), Config.OUTPUT_DIR);

    Logger.info(this.name, `Generated ${cases.length} test cases across ${pages.length} page(s).`);
    return context;
  }

  private addNavigationCases(pageUrl: string, nav: any, bucket: TestCaseRecord[], seq: number) {
    const base = this.idPrefix(pageUrl);
    const title = nav?.title || 'page';

    bucket.push({
      id: `${base}-${seq++}`,
      page: pageUrl,
      category: 'navigation',
      type: 'positive',
      title: `Load ${title} successfully`,
      steps: [
        `Open ${pageUrl}`,
        'Wait for DOMContentLoaded',
        'Capture page title and console errors'
      ],
      expected: 'Page loads within acceptable time and title is not empty; no severe console errors'
    });

    bucket.push({
      id: `${base}-${seq++}`,
      page: pageUrl,
      category: 'navigation',
      type: 'negative',
      title: 'Graceful handling of broken navigation',
      steps: [
        `Attempt to navigate to an invalid path under ${pageUrl} (e.g., /invalid-test-path)`,
        'Observe response and UI'
      ],
      expected: 'User sees branded 404/empty state without crashes; navigation controls remain usable'
    });

    bucket.push({
      id: `${base}-${seq++}`,
      page: pageUrl,
      category: 'performance',
      type: 'edge',
      title: 'First paint under slow network',
      steps: [
        'Throttle network to Slow 3G',
        `Open ${pageUrl}`,
        'Measure time to first contentful paint'
      ],
      expected: 'Critical UI (header/hero) appears within acceptable threshold under degraded bandwidth'
    });

    return seq;
  }

  private addButtonCases(pageUrl: string, buttons: any[] | undefined, bucket: TestCaseRecord[], seq: number) {
    if (!buttons?.length) return seq;
    const limit = Math.min(buttons.length, 10);
    const base = this.idPrefix(pageUrl);

    for (let i = 0; i < limit; i++) {
      const btn = buttons[i];
      const label = btn.text || btn.id || `button-${i + 1}`;
      bucket.push({
        id: `${base}-${seq++}`,
        page: pageUrl,
        category: 'interaction',
        type: 'positive',
        title: `Click "${label}" triggers expected action`,
        steps: [
          `Locate button "${label}" on ${pageUrl}`,
          'Click the button',
          'Observe navigation, modal, or state change'
        ],
        expected: 'Click results in visible action (navigation, modal open, or state change) without JS errors',
        data: { selectorHint: btn.id || btn.className }
      });
    }

    return seq;
  }

  private addFormCases(pageUrl: string, forms: any[] | undefined, bucket: TestCaseRecord[], seq: number) {
    if (!forms?.length) return seq;
    const base = this.idPrefix(pageUrl);

    forms.slice(0, 5).forEach((form, idx) => {
      const formLabel = form.action || `form-${idx + 1}`;

      bucket.push({
        id: `${base}-${seq++}`,
        page: pageUrl,
        category: 'form',
        type: 'positive',
        title: `Submit ${formLabel} with valid data`,
        steps: [
          `Open ${pageUrl}`,
          `Fill all inputs in ${formLabel} with valid sample values`,
          'Submit the form'
        ],
        expected: 'Submission succeeds with success message or navigation; no validation errors',
        data: { method: form.method, inputs: form.inputs?.map((i: any) => i.name || i.id) }
      });

      bucket.push({
        id: `${base}-${seq++}`,
        page: pageUrl,
        category: 'form',
        type: 'negative',
        title: `${formLabel}: required field validation`,
        steps: [
          `Open ${pageUrl}`,
          `Leave one required/visible field empty in ${formLabel}`,
          'Submit the form'
        ],
        expected: 'Inline validation highlights the empty field; form does not submit'
      });

      bucket.push({
        id: `${base}-${seq++}`,
        page: pageUrl,
        category: 'form',
        type: 'edge',
        title: `${formLabel}: boundary input lengths`,
        steps: [
          `Open ${pageUrl}`,
          'Fill text inputs with 256+ characters and numeric inputs with large values',
          'Submit the form'
        ],
        expected: 'Form handles oversized input gracefully (truncation or validation message) without breaking layout'
      });

      const hasEmail = form.inputs?.some((i: any) => (i.type || '').toLowerCase() === 'email');
      if (hasEmail) {
        bucket.push({
          id: `${base}-${seq++}`,
          page: pageUrl,
          category: 'form',
          type: 'negative',
          title: `${formLabel}: invalid email is rejected`,
          steps: [
            `Open ${pageUrl}`,
            'Enter "not-an-email" in email field',
            'Submit the form'
          ],
          expected: 'Client-side validation blocks submission and shows clear error on email field'
        });
      }
    });

    return seq;
  }

  private addIntegrationCases(pageUrl: string, integrations: any, bucket: TestCaseRecord[], seq: number) {
    if (!integrations) return seq;
    const base = this.idPrefix(pageUrl);
    const scripts = integrations.scripts || [];
    const iframes = integrations.iframes || [];

    if (scripts.length) {
      bucket.push({
        id: `${base}-${seq++}`,
        page: pageUrl,
        category: 'integration',
        type: 'edge',
        title: 'Third-party scripts resiliency',
        steps: [
          `Simulate blocked network for one external script (e.g., via request interception) on ${pageUrl}`,
          'Load the page',
          'Observe UI fallbacks'
        ],
        expected: 'Page remains usable and shows graceful degradation when a script fails to load'
      });
    }

    if (iframes.length) {
      bucket.push({
        id: `${base}-${seq++}`,
        page: pageUrl,
        category: 'integration',
        type: 'positive',
        title: 'Embedded iframe renders',
        steps: [
          `Load ${pageUrl}`,
          'Wait for iframe content to render',
          'Verify embedded content is visible'
        ],
        expected: 'Iframe loads without mixed-content or CSP errors; content is visible'
      });
    }

    return seq;
  }

  private addContentEdgeCases(pageUrl: string, textContents: any[] | undefined, bucket: TestCaseRecord[], seq: number) {
    if (!textContents?.length) return seq;
    const base = this.idPrefix(pageUrl);

    bucket.push({
      id: `${base}-${seq++}`,
      page: pageUrl,
      category: 'content',
      type: 'edge',
      title: 'Accessibility: headings are sequential',
      steps: [
        `Inspect heading hierarchy on ${pageUrl}`,
        'Check that h1->h2->h3 order is logical without level skips'
      ],
      expected: 'No skipped heading levels; improves screen reader navigation'
    });

    bucket.push({
      id: `${base}-${seq++}`,
      page: pageUrl,
      category: 'content',
      type: 'positive',
      title: 'Key content visible above the fold',
      steps: [
        `Load ${pageUrl}`,
        'Verify primary headline and CTA are visible without scrolling'
      ],
      expected: 'Critical messaging appears immediately to user'
    });

    return seq;
  }

  private idPrefix(pageUrl: string) {
    const slug = pageUrl.replace(/https?:\/\//, '').split(/[/?#]/)[0] || 'site';
    return `TC-${slug}`;
  }

  private toMarkdown(cases: TestCaseRecord[]): string {
    const lines = [
      '# AI Automation Framework - Generated Test Cases',
      '',
      `Total cases: ${cases.length}`,
      ''
    ];

    const byPage = cases.reduce((acc: Record<string, TestCaseRecord[]>, tc) => {
      acc[tc.page] = acc[tc.page] || [];
      acc[tc.page].push(tc);
      return acc;
    }, {});

    Object.entries(byPage).forEach(([page, items]) => {
      lines.push(`## ${page}`);
      lines.push('');
      items.forEach(tc => {
        lines.push(`- **${tc.id}** [${tc.type.toUpperCase()} | ${tc.category}] - ${tc.title}`);
        lines.push(`  - Steps: ${tc.steps.join(' -> ')}`);
        lines.push(`  - Expected: ${tc.expected}`);
        if (tc.data) lines.push(`  - Data: ${JSON.stringify(tc.data)}`);
      });
      lines.push('');
    });

    return lines.join('\n');
  }
}

