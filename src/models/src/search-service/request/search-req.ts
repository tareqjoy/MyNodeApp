import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsMongoId,
  IsInt,
  Max,
  Min,
} from "class-validator";
import { IsAtLeastOneFieldRequired } from "../../constraints/atleast-one-field-required";
import { Type } from "class-transformer";

export class SearchReq {
  @IsString()
  @IsOptional()
  userToken?: string;

  @IsString()
  @IsOptional()
  postToken?: string;

  @IsString()
  @IsOptional()
  allToken?: string;

  
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit: number = 5;

  @IsOptional()
  @IsString()
  nextToken?: string;

  @IsAtLeastOneFieldRequired(["userToken", "postToken", "allToken"])
  anyField?: string; // This is a dummy field for the validation to work

  constructor();
  constructor(options: {userToken?: string, postToken?: string, allToken?: string, limit?: number, nextToken?: string});
  constructor(options?: {userToken?: string, postToken?: string, allToken?: string, limit?: number, nextToken?: string}) {
    this.userToken = options?.userToken;
    this.postToken = options?.postToken;
    this.allToken = options?.allToken;
    this.limit = options?.limit || 5;
    this.nextToken = options?.nextToken
  }
}
