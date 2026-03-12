import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponse, Story } from '../models/story.model';

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly http = inject(HttpClient);

  getStories(page = 1, limit = 30, from?: string, to?: string): Observable<PaginatedResponse<Story>> {
    const params: Record<string, string | number> = { page, limit };
    if (from) params['from'] = from;
    if (to) params['to'] = to;
    return this.http.get<PaginatedResponse<Story>>('/api/stories', { params });
  }
}
