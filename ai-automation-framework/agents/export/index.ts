import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

const EXPORTS_DIR = path.resolve(Config.BASE_DIR, 'exports');

export class ExportAgent extends BaseAgent {
  constructor() {
    super('ExportAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Generating PDF and PPTX exports...');

    // Ensure exports dir exists
    await fs.promises.mkdir(EXPORTS_DIR, { recursive: true });

    const slides = context.designedSlides
      || (await StorageService.loadJson('designed-slides.json', Config.OUTPUT_DIR)) || [];
    const narrations = context.narrations
      || (await StorageService.loadJson('narration.json', Config.OUTPUT_DIR)) || [];
    const results = await StorageService.loadJson('results.json', Config.OUTPUT_DIR);
    const summary = results?.summary || {};

    // --- Generate PDF ---
    await this.generatePDF(slides, narrations, summary, context);

    // --- Generate PPTX ---
    await this.generatePPTX(slides, narrations, context);

    Logger.info(this.name, 'Exports saved to /exports/');
    return context;
  }

  private async generatePDF(slides: any[], narrations: any[], summary: any, context: AgentContext) {
    const outputPath = path.join(EXPORTS_DIR, 'report.pdf');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Cover Page
    doc.fontSize(28).font('Helvetica-Bold').text('AI Automation Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(`Website: ${context.url}`, { align: 'center' });
    doc.fontSize(12).text(`Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Pages Scanned: ${summary.pagesScanned || 0}   |   Tests: ${summary.totalTests || 0}   |   Pass Rate: ${summary.totalTests ? ((summary.passed / summary.totalTests) * 100).toFixed(1) : 0}%`, { align: 'center' });

    // Each slide as a page
    for (const slide of slides) {
      doc.addPage();
      const narration = narrations.find((n: any) => n.index === slide.index);
      const badge = slide.badge ? ` [${slide.badge}]` : '';

      doc.fontSize(18).font('Helvetica-Bold').text(`Slide ${slide.index + 1}${badge}: ${slide.title}`, { underline: true });
      doc.moveDown(0.5);

      if (slide.bullets?.length) {
        doc.fontSize(12).font('Helvetica');
        for (const bullet of slide.bullets) {
          if (bullet) doc.text(`• ${bullet}`);
        }
      }

      if (slide.media?.length) {
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica-Oblique').text(`Screenshots: ${slide.media.map((m: string) => m.split(/[/\\]/).pop()).join(', ')}`);

        // Attempt to embed first screenshot if it exists
        const imgPath = slide.media[0];
        if (imgPath && fs.existsSync(imgPath)) {
          try {
            doc.moveDown(0.3);
            doc.image(imgPath, { fit: [480, 200], align: 'center' });
          } catch (_) {}
        }
      }

      if (narration) {
        doc.moveDown(0.8);
        doc.fontSize(10).font('Helvetica-Bold').text('Narration:');
        doc.fontSize(10).font('Helvetica-Oblique').text(`"${narration.narration}"`);
        if (narration.transition) {
          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica').fillColor('#666').text(`⏭  ${narration.transition}`).fillColor('black');
        }
      }
    }

    doc.end();
    await new Promise<void>((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    Logger.info(this.name, `PDF saved: ${outputPath}`);
  }

  private async generatePPTX(slides: any[], narrations: any[], context: AgentContext) {
    const outputPath = path.join(EXPORTS_DIR, 'report.pptx');

    // Dynamically import pptxgenjs to avoid CommonJS issues
    const PptxGenJS = require('pptxgenjs');
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';

    // Title slide
    const titleSlide = pptx.addSlide();
    titleSlide.addText('AI Automation Report', { x: 1, y: 1.5, w: 8, fontSize: 36, bold: true, color: '003366', align: 'center' });
    titleSlide.addText(`Website: ${context.url}`, { x: 1, y: 3, w: 8, fontSize: 16, color: '555555', align: 'center' });
    titleSlide.addText(`Generated: ${new Date().toLocaleDateString()}`, { x: 1, y: 3.5, w: 8, fontSize: 12, color: '888888', align: 'center' });

    // Content slides
    for (const slide of slides) {
      const narration = narrations.find((n: any) => n.index === slide.index);
      const pSlide = pptx.addSlide();
      const badge = slide.badge ? ` [${slide.badge}]` : '';

      // Slide title
      pSlide.addText(`Slide ${slide.index + 1}${badge}: ${slide.title}`, {
        x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true,
        color: slide.badge === 'FAIL' ? 'CC0000' : slide.badge === 'PASS' ? '006600' : '003399',
      });

      // Bullets
      if (slide.bullets?.length) {
        const bulletText = slide.bullets
          .filter(Boolean)
          .map((b: string) => ({ text: `• ${b}`, options: { fontSize: 14, bullet: false } }));
        pSlide.addText(bulletText, { x: 0.5, y: 1.2, w: 8.5, h: 3, fontSize: 14, color: '333333' });
      }

      // Try embed screenshot
      if (slide.media?.length) {
        const imgPath = slide.media[0];
        if (imgPath && fs.existsSync(imgPath)) {
          try {
            pSlide.addImage({ path: imgPath, x: 0.5, y: 4.2, w: 4, h: 2.5 });
          } catch (_) {}
        }
      }

      // Narration note
      if (narration?.narration) {
        pSlide.addNotes(narration.narration);
      }
    }

    await pptx.writeFile({ fileName: outputPath });
    Logger.info(this.name, `PPTX saved: ${outputPath}`);
  }
}
