import { IsString, IsBoolean, IsOptional, IsMongoId } from "class-validator";

export class FollowersReq {
  @IsBoolean()
  @IsOptional()
  returnAsUsername: boolean = false;

  constructor();
  constructor(returnAsUsername: boolean);
  constructor(returnAsUsername?: boolean) {
    this.returnAsUsername = returnAsUsername || false;
  }
}

export class FollowersReqInternal {
  @IsString()
  @IsMongoId()
  @IsOptional()
  userId: string;

  @IsBoolean()
  @IsOptional()
  returnAsUsername: boolean = false;

  constructor();
  constructor(userId: string, returnAsUsername?: boolean);
  constructor(userId?: string, returnAsUsername?: boolean) {
    this.userId = userId || "";
    this.returnAsUsername = returnAsUsername || false;
  }
}
