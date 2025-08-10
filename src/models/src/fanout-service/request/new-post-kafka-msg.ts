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

  @IsString()
  @IsNotEmpty()
  postType: string;

  @IsString()
  @IsNotEmpty()
  attachmentIds: string[];

  constructor();
  constructor(
    postId: string,
    userId: string,
    postTime: number,
    postType: string
  );
  constructor(
    postId: string,
    userId: string,
    postTime: number,
    postType: string,
    attachmentIds: string[]
  );
  constructor(
    postId?: string,
    userId?: string,
    postTime?: number,
    postType?: string,
    attachmentIds?: string[]
  ) {
    this.postId = postId || "";
    this.userId = userId || "";
    this.postTime = postTime || 0;
    this.postType = postType || "";
    this.attachmentIds = attachmentIds || [];
  }
}
