import { BaseAgent, AgentContext } from '../../core/agent-base';
import { Logger } from '../../core/logger';
import { StorageService } from '../../services/storage';
import { Config } from '../../core/config';
import path from 'path';
import fs from 'fs';

const AUDIO_DIR = path.resolve(Config.BASE_DIR, 'audio');

export class VoiceAgent extends BaseAgent {
  constructor() {
    super('VoiceAgent');
  }

  async execute(context: AgentContext): Promise<AgentContext> {
    Logger.step(this.name, 'Generating TTS audio for all slides...');

    await fs.promises.mkdir(AUDIO_DIR, { recursive: true });

    const narrations = context.narrations
      || (await StorageService.loadJson('narration.json', Config.OUTPUT_DIR)) || [];

    if (!narrations.length) {
      Logger.warn(this.name, 'No narrations found. Cannot generate audio.');
      return context;
    }

    // Dynamic require of node-gtts (CommonJS interop)
    let gtts: any;
    try {
      gtts = require('node-gtts');
    } catch (e) {
      Logger.error(this.name, 'node-gtts not installed. Run: npm install node-gtts');
      return context;
    }

    const audioManifest: any[] = [];

    for (const item of narrations) {
      const slideNum = item.index + 1;
      const mp3Filename = `slide-${slideNum}.mp3`;
      const mp3Path = path.join(AUDIO_DIR, mp3Filename);
      const textPath = path.join(AUDIO_DIR, `slide-${slideNum}-narration.txt`);

      // Always save the narration text file
      await fs.promises.writeFile(textPath, item.narration, 'utf-8');

      Logger.info(this.name, `Generating TTS for slide ${slideNum}: "${item.narration.substring(0, 60)}..."`);

      const audioEntry: any = {
        index: item.index,
        slide: item.slide,
        narration: item.narration,
        textFile: textPath,
        audioFile: null,
        audioUrl: null,
        format: 'mp3',
      };

      try {
        await this.generateMp3(gtts, item.narration, mp3Path);

        if (fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 0) {
          audioEntry.audioFile = mp3Path;
          audioEntry.audioUrl = `/audio/${mp3Filename}`;
          Logger.info(this.name, `✅ Audio saved: ${mp3Filename} (${fs.statSync(mp3Path).size} bytes)`);
        } else {
          throw new Error('Generated file is empty or missing');
        }
      } catch (err: any) {
        Logger.error(this.name, `TTS failed for slide ${slideNum}: ${err.message}`);
        audioEntry.format = 'text-only';
      }

      audioManifest.push(audioEntry);
    }

    const successCount = audioManifest.filter(a => a.audioFile).length;
    const manifest = {
      generatedAt: new Date().toISOString(),
      totalSlides: narrations.length,
      audioGenerated: successCount,
      audioDir: AUDIO_DIR,
      slides: audioManifest,
    };

    await StorageService.saveJson('audio-manifest.json', manifest, AUDIO_DIR);
    context.audioManifest = manifest;

    Logger.info(this.name, `Voice narration complete: ${successCount}/${narrations.length} MP3 files generated.`);
    return context;
  }

  private generateMp3(gtts: any, text: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tts = gtts('en');
      // Truncate to 500 chars max per slide for gTTS reliability
      const safeText = text.replace(/['"]/g, ' ').substring(0, 500);
      tts.save(outputPath, safeText, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
