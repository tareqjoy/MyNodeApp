import { Type } from "class-transformer";
import { IsString, IsNotEmpty, IsNumber, Min } from "class-validator";

export class CreatePostReq {
  @IsString()
  @IsNotEmpty()
  body: string = "";

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  postTime: number = 0;

  constructor();
  constructor(body: string, postTime: number);
  constructor(body?: string, postTime?: number) {
    this.body = body || "";
    this.postTime = postTime || 1;
  }
}
