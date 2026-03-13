import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

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

        <button class="nav-btn" (click)="prevWeek()" title="Previous week">&#8250;</button>
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
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      .toISOString()
      .slice(0, 10);
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
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset * 7 - i));
      const iso = d.toISOString().slice(0, 10);

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
          timeZone: 'UTC',
        });
      }

      links.push({ label, date: iso });
    }

    return links;
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
