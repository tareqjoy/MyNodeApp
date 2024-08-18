import { Transform } from 'class-transformer';
import { IsArray, IsMongoId, IsOptional } from 'class-validator';
import { IsAtLeastOneFieldRequired } from './constraints/IsAtLeastOneFieldRequired';

export class UserIdsDto {
  @IsOptional()
  username?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value])) // Normalize to an array
  @IsArray()
  usernames?: string[];

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value])) // Normalize to an array
  @IsArray()
  @IsMongoId({each: true})
  userIds?: string[];


  @IsAtLeastOneFieldRequired(['username', 'usernames', 'userId', 'userIds'])
  anyField?: string; // This is a dummy field for the validation to work

  getNormalizedUsernames(): string[] {
    const norms: Set<string> = new Set();
    if (this.usernames) {
      this.usernames.forEach(uname => norms.add(uname));
    }
    if (this.username) {
      norms.add(this.username);
    }
    return Array.from<string>(norms);
  }

  getNormalizedIds(): string[] {
    const norms: Set<string> = new Set();
    if (this.userIds) {
      this.userIds.forEach(uid => norms.add(uid));
    }
    if (this.userId) {
      norms.add(this.userId);
    }
    return Array.from<string>(norms);
  }
}