import { IsString, IsNotEmpty } from "class-validator";

export class UnfollowReq {
  @IsString()
  @IsNotEmpty()
  unfollowsUsername: string = "";

  constructor();
  constructor(unfollowsUsername: string);
  constructor(unfollowsUsername?: string) {
    this.unfollowsUsername = unfollowsUsername || "";
  }
}
