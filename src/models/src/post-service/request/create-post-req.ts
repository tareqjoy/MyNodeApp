import { Transform, Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  IsMongoId,
} from "class-validator";

export class CreatePostReq {
  @IsString()
  @IsNotEmpty()
  body: string = "";

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsMongoId({ each: true })
  attachmentIds?: string[];

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  postTime: number = 0;

  constructor();
  constructor(body: string, postTime: number);
  constructor(body: string, postTime: number, attachmentIds: string);
  constructor(body: string, postTime: number, attachmentIds: string[]);
  constructor(body?: string, postTime?: number, attachmentIds?: string[] | string) {
    this.body = body || "";
    this.postTime = postTime || 1;
    if (attachmentIds && typeof attachmentIds === "string") {
      this.attachmentIds = [attachmentIds];
    } else if (attachmentIds && Array.isArray(attachmentIds)) {
      this.attachmentIds = attachmentIds.filter((f) => typeof f === "string");
    } 
  }
}

export class CreateProfilePhotoPostReq {
  @IsString()
  @IsNotEmpty()
  body: string = "";

  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  attachmentId: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  postTime: number = 0;

  constructor();
  constructor(body: string, postTime: number, attachmentId: string);
  constructor(body?: string, postTime?: number, attachmentId?: string) {
    this.body = body || "";
    this.postTime = postTime || 1;
    this.attachmentId = attachmentId || "";
  }
}