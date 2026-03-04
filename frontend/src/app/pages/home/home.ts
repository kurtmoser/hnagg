import { Component, inject, OnInit, signal } from '@angular/core';
import { StoriesService } from '../../services/stories.service';
import { PaginationMeta, Story } from '../../models/story.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private readonly storiesService = inject(StoriesService);

  readonly stories = signal<Story[]>([]);
  readonly meta = signal<PaginationMeta | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadPage(1);
  }

  loadPage(page: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.storiesService.getStories(page).subscribe({
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
    return this.meta()?.totalPages ?? 0;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.loadPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.loadPage(this.currentPage + 1);
    }
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

  rank(index: number): number {
    const page = this.currentPage;
    const limit = this.meta()?.limit ?? 30;
    return (page - 1) * limit + index + 1;
  }
}
