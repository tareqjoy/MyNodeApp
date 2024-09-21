import { AuthGenerateRes } from "../../auth-service/response/AuthGenerateRes";

export class SignInUserInfo {
    userId: string;
    username: string;

    constructor();
    constructor(userId: string, username: string);
    constructor(userId?: string, username?: string) {
        this.userId = userId || "";
        this.username = username || "";
    }
}

export class SignInRes {
    auth: AuthGenerateRes;
    user: SignInUserInfo;
    
    constructor();
    constructor(auth: AuthGenerateRes, user: SignInUserInfo);
    constructor(auth?: AuthGenerateRes, user?: SignInUserInfo) {
        this.auth = auth || new AuthGenerateRes();
        this.user = user || new SignInUserInfo();
    }
}
