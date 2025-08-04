
import {
  IsNotEmpty,
  IsString,
  Matches,
} from "class-validator";

export class ProfilePhotoUpdateReq {
  @IsNotEmpty({ message: "fileName is required" })
  @IsString({ message: "fileName must be a string" })
  fileName: string = "";

  @IsNotEmpty({ message: "uploadedAt is required" })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, {
    message: "uploadedAt must be in ISO format: YYYY-MM-DDTHH:mm:ss(.sss)Z",
  })
  uploadedAt: string = "";

  constructor();
  constructor(fileName: string, uploadedAt: string);
  constructor(fileName?: string, uploadedAt?: string) {
    this.fileName = fileName || "";
    this.uploadedAt = uploadedAt || "";
  }
}
