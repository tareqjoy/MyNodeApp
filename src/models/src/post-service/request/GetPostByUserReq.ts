import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsMongoId, IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { IsAtLeastOneFieldRequired } from '../../constraints/IsAtLeastOneFieldRequired';

export class GetPostByUserReq {
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value])) 
  @IsArray()
  usernames?: string[];

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value])) 
  @IsArray()
  @IsMongoId({each: true})
  userIds?: string[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  startTime: number = Date.now();

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  endTime?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit: number = 100;

  @IsBoolean()
  @IsOptional()
  returnOnlyPostId: boolean = false;

  @IsBoolean()
  @IsOptional()
  returnAsUsername: boolean = false; // not needed when returnOnlyPostId = true as userId/name will not be returned anyway as response

  @IsAtLeastOneFieldRequired(['usernames', 'userIds'])
  anyField?: string; // This is a dummy field for the validation to work

  getNormalizedUserIds(): string[] {
    if (this.usernames) {
      return this.usernames;
    }
    if (this.userIds) {
      return this.userIds;
    }
    return [];
  }

  constructor();
  constructor(namesOrIds?: string[], providedUsernames?: boolean);
  constructor(namesOrIds?: string[], providedUsernames?: boolean, options?: {startTime?: number, endTime?: number, limit?: number, returnAsUsername?: boolean, returnOnlyPostId?: boolean});
  constructor(namesOrIds?: string[], providedUsernames?: boolean, options?: {startTime?: number, endTime?: number, limit?: number, returnAsUsername?: boolean, returnOnlyPostId?: boolean}) {
      if (providedUsernames) {
        this.usernames = namesOrIds;
      } else {
        this.userIds = namesOrIds;
      }

      this.startTime = options?.startTime || Date.now();
      this.endTime = options?.endTime; //undefined means no end time, rely on limit
      this.limit = options?.limit || 100;
      this.returnAsUsername = options?.returnAsUsername || false;
      this.returnOnlyPostId = options?.returnOnlyPostId || false;
  }
}