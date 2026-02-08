import { IsOptional, IsString } from "class-validator";

//RFC recommendation: https://www.rfc-editor.org/rfc/rfc6749#section-6
export class AuthRefreshReq {
  @IsString()
  @IsOptional()
  refresh_token?: string;

  constructor();
  constructor(refresh_token: string);
  constructor(refresh_token?: string) {
    if (refresh_token !== undefined) {
      this.refresh_token = refresh_token;
    }
  }
}
