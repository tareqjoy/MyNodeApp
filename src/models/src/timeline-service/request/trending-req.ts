import { Type } from "class-transformer";
import {
  IsString,
  Min,
  IsOptional,
  IsInt,
  Max,
  IsIn,
} from "class-validator";

export class TrendingReq {
  @IsOptional()
  @IsString()
  @IsIn(["1h", "24h", "30d"])
  window?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit: number = 100;

  constructor();
  constructor(window: string);
  constructor(limit: number);
  constructor(window: string, limit: number);
  constructor(windowOrLimit?: string | number, limit?: number) {
    if (typeof windowOrLimit === "string") {
      this.window = windowOrLimit || undefined;
      this.limit = limit || 100;
    } else if (typeof windowOrLimit === "number") {
      this.limit = windowOrLimit || 100;
    }
  }
}
