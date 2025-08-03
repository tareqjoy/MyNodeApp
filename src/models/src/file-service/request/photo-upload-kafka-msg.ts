import { IsMongoId, IsOptional, IsString } from "class-validator";
import { IsAtLeastOneFieldRequired } from "../../constraints/atleast-one-field-required";

export class PhotoUploadKafkaMsg {
  @IsString()
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  @IsMongoId()
  postId?: string;

  @IsString()
  photoPath: string;

  @IsAtLeastOneFieldRequired(["userId", "postId"])
  anyField?: string;

  constructor();
  constructor(photoPath: string, options: { userId?: string; postId?: string });
  constructor(
    photoPath?: string,
    options?: { userId?: string; postId?: string }
  ) {
    this.photoPath = photoPath || "";
    this.userId = options?.userId;
    this.postId = options?.postId;
  }
}
