import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export const ALLOWED_TIMEFRAMES = ['1d', '2d', '3d', '5d', '1w', '1m'] as const;
export type Timeframe = (typeof ALLOWED_TIMEFRAMES)[number];

export const ALLOWED_PERIODS = ['day'] as const;
export type Period = (typeof ALLOWED_PERIODS)[number];

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 30;

  @IsOptional()
  @IsIn(ALLOWED_TIMEFRAMES)
  timeframe?: Timeframe;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;

  @IsOptional()
  @IsIn(ALLOWED_PERIODS)
  period?: Period;
}
