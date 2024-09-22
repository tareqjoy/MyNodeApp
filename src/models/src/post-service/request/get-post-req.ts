import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsMongoId, IsOptional } from 'class-validator';
import { IsAtLeastOneFieldRequired } from '../../constraints/atleast-one-field-required';

export class GetPostReq {
  @IsOptional()
  @IsMongoId()
  postId?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value])) 
  @IsArray()
  @IsMongoId({each: true})
  postIds?: string[];

  @IsBoolean()
  @IsOptional()
  returnAsUsername: boolean = false;

  @IsAtLeastOneFieldRequired(['postIds', 'postId'])
  anyField?: string; // This is a dummy field for the validation to work

  getNormalizedPostIds(): string[] {
    const norms: Set<string> = new Set();
    if (this.postIds) {
      this.postIds.forEach(id => norms.add(id));
    }
    if (this.postId) {
      norms.add(this.postId);
    }
    return Array.from<string>(norms);
  }

  constructor();
  constructor(idOrIds?: string | string[]);
  constructor(idOrIds?: string | string[], returnAsUsername?: boolean);
  constructor(idOrIds?: string | string[], returnAsUsername?: boolean) {
      if (idOrIds) {
        if (Array.isArray(idOrIds)) {
          this.postIds = idOrIds;
        } else {
          this.postId = idOrIds;
        }
      }

      if (returnAsUsername) {
        this.returnAsUsername = returnAsUsername;
      }
  }
}