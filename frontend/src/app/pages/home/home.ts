import { DOCUMENT } from '@angular/common';
import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StoriesService } from '../../services/stories.service';
import { PaginationMeta, Story } from '../../models/story.model';

const MAX_PAGES = 5;
const MIN_DATE = '2026-03-01';
const SWIPE_THRESHOLD = 50;

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  imports: [RouterLink],
})
export class Home implements OnInit {
  private touchStartX = 0;
  private touchStartY = 0;
  private readonly storiesService = inject(StoriesService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly titleService = inject(Title);
  private readonly document = inject(DOCUMENT);

  readonly stories = signal<Story[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly activeDate = signal<string | null>(null);
  readonly activePage = signal(1);

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].clientX;
    this.touchStartY = event.changedTouches[0].clientY;
  }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent): void {
    const deltaX = event.changedTouches[0].clientX - this.touchStartX;
    const deltaY = event.changedTouches[0].clientY - this.touchStartY;

    if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(deltaX) > Math.abs(deltaY)) {
      const date = this.activeDate();
      if (!date) return;

      if (deltaX > 0) {
        // Swipe right → next day (newer)
        const next = this.addDays(date, 1);
        if (next <= this.todayIso()) {
          this.router.navigate(['/date', next]);
        }
      } else {
        // Swipe left → previous day (older)
        const prev = this.addDays(date, -1);
        if (prev >= MIN_DATE) {
          this.router.navigate(['/date', prev]);
        }
      }
    }
  }

  private addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const param = params.get('date');
      const date = param ?? this.todayIso();
      const pageParam = params.get('page');
      const page = pageParam ? parseInt(pageParam, 10) : 1;

      if (param && (date < MIN_DATE || date > this.todayIso())) {
        this.router.navigate(['/'], { replaceUrl: true });
        return;
      }

      if (page > MAX_PAGES || page < 1 || isNaN(page)) {
        this.router.navigate(['/date', date], { replaceUrl: true });
        return;
      }

      this.activeDate.set(date);
      this.activePage.set(page);
      this.titleService.setTitle(param ? this.heading() : 'Top Hacker News Stories');
      this.setCanonical(param ? `https://hnagg.com/date/${date}` : 'https://hnagg.com/');
      this.loadPage(page);
      window.scrollTo(0, 0);
    });
  }

  private todayIso(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    const date = this.activeDate();
    const { from, to } = date ? this.dateToRange(date) : {};

    this.storiesService.getStories(page, 30, from, to).subscribe({
      next: (response) => {
        this.stories.set(response.data);
        this.meta.set(response.meta);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Failed to load stories. Please try again.');
        this.loading.set(false);
        console.error('Error loading stories:', err);
      },
    });
  }

  get currentPage(): number {
    return this.meta()?.page ?? 1;
  }

  get totalPages(): number {
    return Math.min(this.meta()?.totalPages ?? 0, MAX_PAGES);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  pageLink(page: number): string {
    const date = this.activeDate();
    if (page <= 1) return `/date/${date}`;
    return `/date/${date}/${page}`;
  }

  private dateToRange(date: string): { from: string; to: string } {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return { from: date, to: d.toISOString().slice(0, 10) };
  }

  timeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  }

  storyDomain(url: string | null): string {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private setCanonical(url: string): void {
    const head = this.document.head;
    let link = head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  heading(): string {
    const date = this.activeDate();
    if (!date) return 'Top Hacker News Stories';
    const d = new Date(`${date}T12:00:00Z`);
    const formatted = d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
    return `Top Hacker News Stories – ${formatted}`;
  }

  rank(index: number): number {
    const page = this.currentPage;
    const limit = this.meta()?.limit ?? 30;
    return (page - 1) * limit + index + 1;
  }
}
