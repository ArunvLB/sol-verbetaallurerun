import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';

/**
 * Builds a minimal happy-path recording (webrecorder.json) from the pages
 * discovered in the current run. This lets downstream replays regenerate
 * the crawl deterministically without manual recordings.
 */
export class RecordingBuilderAgent extends BaseAgent {
  constructor() {
    super('RecordingBuilderAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    const pages = context.pages || (context.url ? [context.url] : []);
    if (!pages.length) {
      Logger.warn(this.name, 'No pages available to build recording.');
      return context;
    }

    const steps: any[] = [
      { type: 'setViewport', width: 1280, height: 800 }
    ];

    // Generate a simple navigate-through-pages flow.
    for (const pageUrl of pages) {
      steps.push({
        type: 'navigate',
        url: pageUrl,
        assertedEvents: [{ type: 'navigation', url: pageUrl }]
      });
    }

    const recording = {
      title: `Auto recording ${new Date().toISOString()}`,
      steps
    };

    await StorageService.saveJson('webrecorder.json', recording, Config.OUTPUT_DIR);
    Logger.info(this.name, `Saved auto recording with ${steps.length} step(s) to output/webrecorder.json`);

    // Expose to context for replay agent if needed in same run.
    context.recordingSteps = steps;
    context.recordingTitle = recording.title;

    return context;
  }
}
