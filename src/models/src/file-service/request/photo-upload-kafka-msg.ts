import { IsMongoId, IsNotEmpty, IsOptional, IsString, Matches } from "class-validator";
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
  @IsNotEmpty()
  photoName: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, {
    message: "uploadedAt must be in ISO format: YYYY-MM-DDTHH:mm:ss(.sss)Z",
  })
  @IsNotEmpty()
  uploadedAt: string;

  @IsAtLeastOneFieldRequired(["userId", "postId"])
  anyField?: string;

  constructor();
  constructor(
    photoName: string,
    uploadedAt: string,
    options: { userId?: string; postId?: string }
  );
  constructor(
    photoName?: string,
    uploadedAt?: string,
    options?: { userId?: string; postId?: string }
  ) {
    this.photoName = photoName || "";
    this.uploadedAt = uploadedAt || new Date().toISOString();
    this.userId = options?.userId;
    this.postId = options?.postId;
  }
}
