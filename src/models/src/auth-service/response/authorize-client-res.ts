//RFC recommendation: https://www.rfc-editor.org/rfc/rfc6749#section-4.1.2
export class AuthorizeClientRes {
  code?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: "Bearer";

  constructor();
  constructor(code: string);
  constructor(access_token: string, refresh_token: string, expires_in: number);
  constructor(
    code_or_token?: string,
    refresh_token?: string,
    expires_in?: number,
  ) {
    if (refresh_token) {
      this.access_token = code_or_token;
      this.refresh_token = refresh_token;
      this.expires_in = expires_in;
      this.token_type = "Bearer";
    } else {
      this.code = code_or_token;
    }
  }
}
