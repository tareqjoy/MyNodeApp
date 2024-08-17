import { Transform } from 'class-transformer';
import { IsArray, IsOptional } from 'class-validator';

export class UserIdsDto {
  @IsOptional()
  username?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value])) // Normalize to an array
  @IsArray()
  usernames?: string[];

  getNormalizedIds(): string[] {
    if (this.usernames) {
      return this.usernames;
    }
    if (this.username) {
      return [this.username];
    }
    return [];
  }
}