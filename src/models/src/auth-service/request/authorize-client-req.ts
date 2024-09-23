import { IsNotEmpty, IsString } from "class-validator";

export class AuthorizeClientReq {
    @IsString()
    @IsNotEmpty()
    clientId?: string;

    constructor();
    constructor(clientId: string);
    constructor(clientId?: string) {
        this.clientId = clientId;
    }
};