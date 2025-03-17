import { IsString, IsNotEmpty,  IsIn } from "class-validator";

export class UnlikeReq {
  @IsString()
  @IsNotEmpty()
  postId: string = "";

  constructor();
  constructor(postId: string);
  constructor(postId?: string) {
    this.postId = postId || "";
  }
}
