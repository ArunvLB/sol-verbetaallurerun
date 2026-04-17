import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';
import { DesignedSlide } from '../slide-designer';

export interface SlideNarration {
  index: number;
  slide: string;
  narration: string;
  transition?: string;
}

const TRANSITIONS = [
  "Let's start by looking at",
  "Now let's move to",
  "Next, we analyze",
  "Moving on, let's examine",
  "Finally, let's review",
];

function getTransition(index: number): string {
  return TRANSITIONS[Math.min(index, TRANSITIONS.length - 1)];
}

export class NarrationAgent extends BaseAgent {
  constructor() {
    super('NarrationAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Generating narration for designed slides...');

    const slides: DesignedSlide[] = context.designedSlides
      || (await StorageService.loadJson('designed-slides.json', Config.OUTPUT_DIR)) || [];

    const narrations: SlideNarration[] = slides.map((slide, i) => {
      const transition = i === 0 ? "Let's begin with" : getTransition(i);
      let narration = '';

      switch (slide.title) {
        case 'Overview':
          narration = `${transition} an overview of the automated test run. ${slide.bullets[0] || ''} The analysis was performed on ${slide.bullets[2] || 'multiple pages'}, giving us a comprehensive view of the site's current state.`;
          break;

        case 'Coverage':
          narration = `${transition} our page coverage. The discovery agent mapped ${slide.bullets.length} pages across the site, extracting buttons, headings, and key UI elements from each page for in-depth analysis.`;
          break;

        case 'Integrations & Forms':
          narration = `${transition} integrations and forms detected. We identified ${slide.bullets[0]?.toLowerCase() || 'forms'} across the site, along with embedded iframes and third-party scripts such as reCAPTCHA and analytics tools.`;
          break;

        case 'Test Results': {
          const badge = slide.badge === 'PASS' ? 'All tests passed successfully.' : 'Some tests failed — please review.';
          narration = `${transition} our test results. ${slide.bullets.join('. ')}. ${badge}`;
          break;
        }

        case 'Failures':
          narration = `${transition} the critical failures identified during testing. ${slide.bullets.slice(0, 3).join('. ')}. These issues need immediate attention before deployment.`;
          break;

        case 'Visual Captures':
          narration = `${transition} the visual captures taken by the Media Agent. Full-page screenshots were recorded for each page crawled, allowing for visual regression comparison in future runs.`;
          break;

        default:
          narration = `${transition} slide ${i + 1}: ${slide.title}. ${slide.bullets.slice(0, 2).join('. ')}.`;
      }

      return {
        index: i,
        slide: slide.title,
        narration: narration.trim(),
        transition: i < slides.length - 1 ? getTransition(i + 1) + ' ' + slides[i + 1]?.title + '...' : 'End of presentation.',
      };
    });

    context.narrations = narrations;
    await StorageService.saveJson('narration.json', narrations, Config.OUTPUT_DIR);
    Logger.info(this.name, `Generated ${narrations.length} narrations → narration.json`);

    return context;
  }
}
