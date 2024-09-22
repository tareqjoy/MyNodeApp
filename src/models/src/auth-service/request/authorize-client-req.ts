import { IsNotEmpty, IsString } from "class-validator";

export class AuthorizeClientReq {
    @IsString()
    @IsNotEmpty()
    clientId?: string;

    @IsString()
    @IsNotEmpty()
    clientSecret?: string;
};