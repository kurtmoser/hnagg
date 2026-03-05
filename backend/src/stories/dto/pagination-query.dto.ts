import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const ALLOWED_TIMEFRAMES = ['1d', '2d', '3d', '5d', '1w', '1m'] as const;
export type Timeframe = (typeof ALLOWED_TIMEFRAMES)[number];

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
}
