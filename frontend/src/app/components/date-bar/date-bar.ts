import { Component, computed, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

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
export class DateBar {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly selectedDate = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('date') ?? '')),
    { initialValue: '' },
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

  selectDate(date: string): void {
    const current = this.selectedDate();
    if (current === date) {
      // Clicking active date clears the filter
      this.router.navigate(['/'], { queryParams: {} });
    } else {
      this.router.navigate(['/'], { queryParams: { date } });
    }
  }
}
