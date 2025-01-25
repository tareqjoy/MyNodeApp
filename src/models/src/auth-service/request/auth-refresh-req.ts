import { IsNotEmpty, IsOptional, IsString } from "class-validator";

//RFC recommendation: https://www.rfc-editor.org/rfc/rfc6749#section-6
export class AuthRefreshReq {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;

  constructor();
  constructor(refresh_token: string);
  constructor(refresh_token?: string) {
    this.refresh_token = refresh_token || "";
  }
}
