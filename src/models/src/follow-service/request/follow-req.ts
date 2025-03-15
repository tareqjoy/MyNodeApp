import { IsString, IsNotEmpty, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";

export class FollowReq {
  @IsString()
  @IsNotEmpty()
  followsUsername: string = "";

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  followTime: number = -1;

  constructor();
  constructor(followsUsername: string, followTime: number);
  constructor(followsUsername?: string, followTime?: number) {
    this.followsUsername = followsUsername || "";
    this.followTime = followTime || 0;
  }
}
