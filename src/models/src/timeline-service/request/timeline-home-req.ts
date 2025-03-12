import { Type } from "class-transformer";
import {
  IsString,
  Min,
  IsOptional,
  IsInt,
  Max,
} from "class-validator";

export class TimelineHomeReq {
  @IsOptional()
  @IsString()
  nextToken?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit: number = 100;

  constructor();
  constructor(nextToken: string);
  constructor(limit: number);
  constructor(nextToken: string, limit: number);
  constructor(nextTokenOrLimit?: string | number, limit?: number) {
    if (typeof nextTokenOrLimit === "string") {
      this.nextToken = nextTokenOrLimit || undefined;
      this.limit = limit || 100;
    } else if(typeof nextTokenOrLimit === "number") {
      this.limit = nextTokenOrLimit || 100;
    }
  }
}
