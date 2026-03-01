import { Command, CommandRunner } from 'nest-commander';
import * as https from 'https';
import { HnImportService } from '../hn/hn-import.service';

const UPDATES_URL =
  'https://hacker-news.firebaseio.com/v0/updates.json';

const DEBOUNCE_MS = 2000;

@Command({
  name: 'stream-updates',
  description:
    'Long-running: stream HN item updates via SSE and insert missing items',
})
export class StreamUpdatesCommand extends CommandRunner {
  private pendingIds = new Set<number>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private processing = false;

  constructor(private readonly hnImportService: HnImportService) {
    super();
  }

  async run(): Promise<void> {
    console.log('\n🔴 Streaming /v0/updates.json (press Ctrl+C to stop)\n');
    this.connect();
    await new Promise<void>(() => { });
  }

  private connect(): void {
    const req = https.get(
      UPDATES_URL,
      { headers: { Accept: 'text/event-stream' } },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(`❌ Unexpected status: ${res.statusCode}`);
          process.exit(1);
        }

        let buffer = '';

        res.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            this.handleEvent(part);
          }
        });

        res.on('end', () => {
          console.log('⚠️  Connection closed, reconnecting in 3s...');
          setTimeout(() => this.connect(), 3000);
        });

        res.on('error', (err) => {
          console.error('❌ Stream error:', err.message);
          console.log('⚠️  Reconnecting in 3s...');
          setTimeout(() => this.connect(), 3000);
        });
      },
    );

    req.on('error', (err) => {
      console.error('❌ Request error:', err.message);
      console.log('⚠️  Reconnecting in 3s...');
      setTimeout(() => this.connect(), 3000);
    });
  }

  private handleEvent(raw: string): void {
    const lines = raw.split('\n');
    let data = '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        data += line.slice(6);
      }
    }

    if (!data) return;

    try {
      const parsed = JSON.parse(data);
      const items: number[] = parsed?.data?.items ?? parsed?.items ?? [];
      if (items.length === 0) return;

      for (const id of items) {
        this.pendingIds.add(id);
      }

      this.scheduleProcessing();
    } catch {
      // keep-alive or non-JSON event, ignore
    }
  }

  private scheduleProcessing(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingIds();
    }, DEBOUNCE_MS);
  }

  private async processPendingIds(): Promise<void> {
    if (this.processing || this.pendingIds.size === 0) return;

    this.processing = true;
    const ids = Array.from(this.pendingIds);
    this.pendingIds.clear();

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Processing ${ids.length} item IDs...`);

    try {
      const result = await this.hnImportService.syncItems(ids);
      console.log(
        `  ✅ ${result.inserted} inserted, ${result.updated} updated, ${result.unchanged} unchanged, ${result.skippedNonStory} non-story skipped`,
      );
    } catch (err) {
      console.error(`  ❌ Error:`, err.message ?? err);
    }

    this.processing = false;

    // if more IDs accumulated while processing, schedule again
    if (this.pendingIds.size > 0) {
      this.scheduleProcessing();
    }
  }
}
