import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

const MIN_DATE = '2026-03-01';

interface DateLink {
  label: string;
  date: string; // YYYY-MM-DD
}

@Component({
  selector: 'app-date-bar',
  template: `
    <nav class="date-bar">
      <div class="date-bar-content">
        @if (weekOffset() < 0) {
          <button class="nav-btn" (click)="nextWeek()" title="More recent week">&#8249;</button>
        }

        @for (link of dateLinks(); track link.date) {
          <button
            class="date-link"
            [class.active]="link.date === selectedDate()"
            (click)="selectDate(link.date)"
          >{{ link.label }}</button>
        }

        @if (!atMinDate()) {
          <button class="nav-btn" (click)="prevWeek()" title="Previous week">&#8250;</button>
        }
      </div>
    </nav>
  `,
  styles: [`
    .date-bar {
      background: #fff7ed;
      border-bottom: 1px solid #fed7aa;
      padding: 0.5rem 1rem;
    }

    .date-bar-content {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }
    }

    .nav-btn {
      background: none;
      border: none;
      padding: 0.25rem 0.5rem;
      font-size: 1.25rem;
      line-height: 1;
      color: #92400e;
      cursor: pointer;
      border-radius: 9999px;
      transition: all 0.15s ease;
      flex-shrink: 0;

      &:hover:not(:disabled) {
        background: #ffedd5;
      }

      &:disabled {
        color: #fbbf7a;
        cursor: default;
      }
    }

    .date-link {
      background: none;
      border: none;
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #92400e;
      cursor: pointer;
      white-space: nowrap;
      border-radius: 9999px;
      transition: all 0.15s ease;

      &:hover {
        background: #ffedd5;
      }

      &.active {
        background: #f97316;
        color: white;
      }
    }
  `],
})
export class DateBar implements OnInit {
  private readonly router = inject(Router);

  readonly weekOffset = signal(0); // 0 = current week, -1 = one week back, etc.

  private readonly todayIso = (): string => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  };

  private readonly dateFromUrl = (url: string): string => {
    const m = url.match(/^\/date\/(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : this.todayIso();
  };

  /** Offset (in days) of a given ISO date from today. Negative = in the past. */
  private readonly dayOffsetFromToday = (iso: string): number => {
    const today = new Date(this.todayIso());
    const d = new Date(iso);
    return Math.round((d.getTime() - today.getTime()) / 86_400_000);
  };

  readonly selectedDate = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => {
        const date = this.dateFromUrl((e as NavigationEnd).urlAfterRedirects);
        this.syncWeekOffset(date);
        return date;
      }),
      startWith(this.dateFromUrl(this.router.url)),
    ),
    { initialValue: this.dateFromUrl(this.router.url) },
  );

  readonly dateLinks = computed<DateLink[]>(() => {
    const links: DateLink[] = [];
    const offset = this.weekOffset();
    const todayStr = this.todayIso();

    // Use noon UTC as anchor to avoid DST-related date drift when adding days
    const anchor = new Date(`${todayStr}T12:00:00Z`);

    for (let i = 0; i < 7; i++) {
      const d = new Date(anchor.getTime() + (offset * 7 - i) * 86_400_000);
      const iso = d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

      let label: string;
      if (offset === 0 && i === 0) {
        label = 'Today';
      } else if (offset === 0 && i === 1) {
        label = 'Yesterday';
      } else {
        label = d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'America/New_York',
        });
      }

      if (iso >= MIN_DATE) {
        links.push({ label, date: iso });
      }
    }

    return links;
  });

  readonly atMinDate = computed(() => {
    const links = this.dateLinks();
    return links.length > 0 && links[links.length - 1].date === MIN_DATE;
  });

  ngOnInit(): void {
    // Sync offset with the current URL on load
    this.syncWeekOffset(this.dateFromUrl(this.router.url));
  }

  prevWeek(): void {
    this.weekOffset.update((o) => o - 1);
    this.selectTopOfWindow();
  }

  nextWeek(): void {
    if (this.weekOffset() >= 0) return;
    this.weekOffset.update((o) => o + 1);
    this.selectTopOfWindow();
  }

  selectDate(date: string): void {
    this.router.navigate(['/date', date]);
  }

  private selectTopOfWindow(): void {
    const top = this.dateLinks()[0];
    if (top) this.router.navigate(['/date', top.date]);
  }

  private syncWeekOffset(date: string): void {
    const dayOff = this.dayOffsetFromToday(date);
    // Which week bucket? (0 = current week, -1 = previous, …)
    const offset = dayOff <= 0 ? Math.ceil(dayOff / 7) : 0;
    this.weekOffset.set(Math.min(0, offset));
  }
}
