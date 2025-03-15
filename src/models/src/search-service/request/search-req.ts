import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsMongoId,
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

  @IsAtLeastOneFieldRequired(["userToken", "postToken", "allToken"])
  anyField?: string; // This is a dummy field for the validation to work

  constructor();
  constructor(options: {userToken?: string, postToken?: string, allToken?: string});
  constructor(options?: {userToken?: string, postToken?: string, allToken?: string}) {
    this.userToken = options?.userToken;
    this.postToken = options?.postToken;
    this.allToken = options?.allToken;
  }
}
