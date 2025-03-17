import { Type } from "class-transformer";
import { IsString, IsNotEmpty,  IsIn, IsMongoId, IsDateString, IsNumber, Min } from "class-validator";

export class LikeReq {
  @IsString()
  @IsNotEmpty()
  @IsMongoId({message: "bad postId"})
  postId: string = "";

  @IsString()
  @IsNotEmpty()
  @IsIn(["love", "like"])
  reactType: string = "";

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  reactTime: number = 0;

  constructor();
  constructor(postId: string, reactType: string, reactTime: number);
  constructor(postId?: string, reactType?: string, reactTime?: number) {
    this.postId = postId || "";
    this.reactType = reactType || "";
    this.reactTime = reactTime || 0;
  }
}
