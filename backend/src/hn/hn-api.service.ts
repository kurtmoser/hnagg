import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface HnApiItem {
  id: number;
  type: string;
  by?: string;
  time: number;
  url?: string;
  title?: string;
  text?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  parent?: number;
  parts?: number[];
  poll?: number;
  dead?: boolean;
  deleted?: boolean;
}

const BASE_URL = 'https://hacker-news.firebaseio.com/v0';

@Injectable()
export class HnApiService {
  private readonly logger = new Logger(HnApiService.name);

  constructor(private readonly httpService: HttpService) { }

  async getNewStoryIds(): Promise<number[]> {
    const { data } = await firstValueFrom(
      this.httpService.get<number[]>(`${BASE_URL}/newstories.json`),
    );
    return data;
  }

  async getItem(id: number): Promise<HnApiItem | null> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get<HnApiItem>(`${BASE_URL}/item/${id}.json`),
      );
      return data ?? null;
    } catch (error) {
      this.logger.warn(`Failed to fetch item ${id}: ${error.message}`);
      return null;
    }
  }
}
