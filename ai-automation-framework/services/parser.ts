import { Page } from 'playwright';

export class ParserService {
  static async extractLinks(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors.map(a => a.href).filter(href => href.startsWith('http'));
    });
  }

  static async extractForms(page: Page) {
    return page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: f.getAttribute('action') || '',
        method: f.getAttribute('method') || 'GET',
        inputs: Array.from(f.querySelectorAll('input, select, textarea')).map((el: any) => ({
          name: el.name || el.id,
          type: el.type || el.tagName.toLowerCase(),
          id: el.id
        }))
      }));
    });
  }

  static async extractButtons(page: Page) {
    return page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
      return buttons.map((b: any) => ({
        text: b.innerText || b.value,
        id: b.id,
        className: b.className
      }));
    });
  }

  static async extractTextContents(page: Page) {
    return page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      return headings.map(h => ({
        tag: h.tagName.toLowerCase(),
        text: (h.textContent || '').trim()
      })).filter(h => h.text.length > 0);
    });
  }

  /**
   * Capture every visible text node on the page for deep content analysis.
   * Returns an array of objects with the raw text, parent tag, and nearest section id.
   */
  static async extractAllTextContents(page: Page) {
    return page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node: Text) => {
            const value = node.textContent?.trim() || '';
            if (!value) return NodeFilter.FILTER_REJECT;
            if (/^[\\s\\u200B]+$/.test(value)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const results: { text: string; tag: string; sectionId: string }[] = [];
      let current: Text | null = walker.nextNode() as Text | null;
      while (current) {
        const parentEl = current.parentElement;
        const section = parentEl?.closest('section');
        results.push({
          text: (current.textContent || '').trim(),
          tag: (parentEl?.tagName || '').toLowerCase(),
          sectionId: section?.id || ''
        });
        current = walker.nextNode() as Text | null;
      }
      return results;
    });
  }
}
