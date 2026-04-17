import path from 'path';
import fs from 'fs';
import readline from 'readline';

const OUTPUT_DIR = path.resolve(__dirname, 'output');

interface DesignedSlide {
  index: number;
  title: string;
  layout: string;
  bullets: string[];
  media: string[];
  badge?: string;
}

interface SlideNarration {
  index: number;
  slide: string;
  narration: string;
  transition?: string;
}

function loadJson(filename: string): any {
  const filePath = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function renderSlide(slide: DesignedSlide, narration: SlideNarration | undefined) {
  const width = 70;
  const line = '─'.repeat(width);
  const badge = slide.badge ? ` [${slide.badge}]` : '';

  console.log('\n' + line);
  console.log(` 📊 SLIDE ${slide.index + 1}${badge}: ${slide.title.toUpperCase()}`);
  console.log(line);

  if (slide.bullets?.length) {
    slide.bullets.forEach(b => {
      if (b) console.log(`  • ${b}`);
    });
  }

  if (slide.media?.length) {
    console.log('\n  📸 Screenshot(s):');
    slide.media.slice(0, 2).forEach(m => {
      const fname = m.split(/[/\\]/).pop();
      console.log(`    → ${fname}`);
    });
  }

  if (narration) {
    console.log('\n' + '─'.repeat(width));
    console.log(' 🎙️  Narration:');
    console.log(`  "${narration.narration}"`);
    if (narration.transition) {
      console.log(`\n  ⏭  Next: ${narration.transition}`);
    }
  }

  console.log(line);
}

async function pressEnter(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('\n  [Press ENTER for next slide, or Q+ENTER to quit] ', answer => {
      rl.close();
      if (answer.toLowerCase() === 'q') {
        console.log('\n👋 Presentation ended. Goodbye!\n');
        process.exit(0);
      }
      resolve();
    });
  });
}

async function main() {
  const slides: DesignedSlide[] = loadJson('designed-slides.json');
  const narrations: SlideNarration[] = loadJson('narration.json');

  if (!slides || !slides.length) {
    console.error('\n❌ No designed slides found. Please run `npm run start -- --url=<url>` first.\n');
    process.exit(1);
  }

  console.log('\n🚀 Starting AI Automation Framework - Presentation Mode');
  console.log(`   Total Slides: ${slides.length}`);
  console.log('   Use ENTER to advance, Q to quit.\n');

  const autoPlay = process.argv.includes('--auto');
  const delay = parseInt(process.argv.find(a => a.startsWith('--delay='))?.split('=')[1] || '3000', 10);

  for (const slide of slides) {
    const narration = narrations?.find(n => n.index === slide.index);
    renderSlide(slide, narration);

    if (autoPlay) {
      await new Promise(r => setTimeout(r, delay));
    } else {
      await pressEnter();
    }
  }

  console.log('\n✅ Presentation complete! All slides reviewed.\n');
}

main().catch(console.error);
