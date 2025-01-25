import { Type } from "class-transformer";
import { IsMongoId, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class NewPostKafkaMsg {
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  postId: string;

  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  postTime: number;

  constructor();
  constructor(postId: string, userId: string, postTime: number);
  constructor(postId?: string, userId?: string, postTime?: number) {
    this.postId = postId || "";
    this.userId = userId || "";
    this.postTime = postTime || 0;
  }
}
