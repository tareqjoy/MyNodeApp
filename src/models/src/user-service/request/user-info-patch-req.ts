
import {
  IsMongoId,
  IsNotEmpty,
  IsString,
} from "class-validator";

export class ProfilePhotoUpdateReq {
  @IsNotEmpty({ message: "photoPostId is required" })
  @IsMongoId()
  @IsString({ message: "photoPostId must be a string" })
  photoPostId: string = "";

  constructor();
  constructor(photoPostId: string);
  constructor(photoPostId?: string) {
    this.photoPostId = photoPostId || "";
  }
}
