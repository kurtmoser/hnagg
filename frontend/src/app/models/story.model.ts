export interface Story {
  id: number;
  title: string | null;
  url: string | null;
  score: number | null;
  by: string | null;
  time: string;
  descendants: number | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
