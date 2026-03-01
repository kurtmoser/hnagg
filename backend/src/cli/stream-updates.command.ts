import { Command, CommandRunner } from 'nest-commander';
import * as https from 'https';

const UPDATES_URL =
  'https://hacker-news.firebaseio.com/v0/updates.json';

@Command({
  name: 'stream-updates',
  description:
    'Long-running prototype: stream HN item updates via SSE and log them',
})
export class StreamUpdatesCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('\n🔴 Streaming /v0/updates.json (press Ctrl+C to stop)\n');
    this.connect();
    // keep the process alive indefinitely
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
    let eventType = '';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        data += line.slice(6);
      }
    }

    if (!data) return;

    try {
      const parsed = JSON.parse(data);
      const items: number[] = parsed?.data?.items ?? parsed?.items ?? [];
      if (items.length === 0) return;

      const timestamp = new Date().toISOString();
      console.log(
        `[${timestamp}] ${eventType || 'message'}: ${items.length} items changed → [${items.slice(0, 10).join(', ')}${items.length > 10 ? ', ...' : ''}]`,
      );
    } catch {
      // keep-alive or non-JSON event, ignore
    }
  }
}
