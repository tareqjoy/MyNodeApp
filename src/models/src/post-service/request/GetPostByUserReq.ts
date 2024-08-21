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
  startTime: number = 0;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit: number = 100;

  @IsBoolean()
  @IsOptional()
  returnAsUsername: boolean = false;

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
  constructor(namesOrIds?: string[], startTime?: number);
  constructor(namesOrIds?: string[], startTime?: number, limit?: number);
  constructor(namesOrIds?: string[], startTime?: number, limit?: number, returnAsUsername?: boolean);
  constructor(namesOrIds?: string[], startTime?: number, limit?: number, returnAsUsername?: boolean, providedUsernames?: boolean);
  constructor(namesOrIds?: string[], startTime?: number, limit?: number, returnAsUsername?: boolean, providedUsernames?: boolean) {
      if (providedUsernames) {
        this.usernames = namesOrIds;
      } else {
        this.userIds = namesOrIds;
      }

      this.startTime = startTime || Date.now();
      this.limit = limit || 10;
      this.returnAsUsername = returnAsUsername || false;
  }
}