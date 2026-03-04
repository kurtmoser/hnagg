import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PaginatedResponse, Story } from '../models/story.model';

@Injectable({ providedIn: 'root' })
export class StoriesService {
  private readonly http = inject(HttpClient);

  getStories(page = 1, limit = 30): Observable<PaginatedResponse<Story>> {
    return this.http.get<PaginatedResponse<Story>>('/api/stories', {
      params: { page, limit },
    });
  }
}
