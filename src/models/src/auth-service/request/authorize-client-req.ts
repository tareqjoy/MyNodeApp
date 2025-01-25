import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { IsAtLeastOneFieldRequired } from "../../constraints/atleast-one-field-required";

//RFC recommendation: https://www.rfc-editor.org/rfc/rfc6749#section-4.1.1
//& https://www.rfc-editor.org/rfc/rfc6749#section-4.1.3
export class AuthorizeClientReq {
  @IsString()
  @IsOptional()
  client_id?: string;

  @IsString()
  @IsOptional()
  response_type?: "code" = undefined;

  @IsString()
  @IsOptional()
  grant_type?: "authorization_code" = undefined;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  redirect_uri: string;

  @IsAtLeastOneFieldRequired(["response_type", "grant_type"])
  anyField?: string;

  constructor();
  constructor(clientId: string, redirect_uri: string, response_type: "code");
  constructor(
    clientId: string,
    redirect_uri: string,
    grant_type: "authorization_code",
    code: string,
  );
  constructor(
    clientId?: string,
    redirect_uri?: string,
    type?: "code" | "authorization_code",
    code?: string,
  ) {
    this.client_id = clientId;
    this.redirect_uri = redirect_uri || "";
    if (type === "authorization_code") {
      this.code = code;
      this.grant_type = "authorization_code";
    } else if (type === "code") {
      this.response_type = "code";
    }
  }
}
