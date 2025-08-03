import { IsNotEmpty, IsOptional, IsString } from "class-validator";

//RFC recommendation: https://www.rfc-editor.org/rfc/rfc6749#section-6
export class ProfilePhotoReq {
  @IsString()
  @IsNotEmpty()
  file: string;

  constructor();
  constructor(file: string);
  constructor(file?: string) {
    this.file = file || "";
  }
}
