import { Component, computed, inject, OnInit } from '@angular/core';
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
        @for (link of dateLinks(); track link.date) {
          <button
            class="date-link"
            [class.active]="link.date === selectedDate()"
            (click)="selectDate(link.date)"
          >{{ link.label }}</button>
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
      gap: 0.25rem;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
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

  private readonly todayIso = (): string => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      .toISOString()
      .slice(0, 10);
  };

  private readonly dateFromUrl = (url: string): string => {
    const m = url.match(/^\/date\/([\d-]+)/);
    return m ? m[1] : this.todayIso();
  };

  readonly selectedDate = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => this.dateFromUrl((e as NavigationEnd).urlAfterRedirects)),
      startWith(this.dateFromUrl(this.router.url)),
    ),
    { initialValue: this.dateFromUrl(this.router.url) },
  );

  readonly dateLinks = computed<DateLink[]>(() => {
    const links: DateLink[] = [];
    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
      const iso = d.toISOString().slice(0, 10);

      let label: string;
      if (i === 0) {
        label = 'Today';
      } else if (i === 1) {
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

  ngOnInit(): void {}

  selectDate(date: string): void {
    this.router.navigate(['/date', date]);
  }
}
