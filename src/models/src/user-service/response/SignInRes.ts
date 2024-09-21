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
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    tokenType: string = "Bearer";
    user: SignInUserInfo;
    
    constructor();
    constructor(accessToken: string, refreshToken: string, expiresIn: string, user: SignInUserInfo);
    constructor(accessToken?: string, refreshToken?: string, expiresIn?: string, user?: SignInUserInfo) {
        this.accessToken = accessToken || "";
        this.refreshToken = refreshToken || "";
        this.expiresIn = expiresIn || "0s";
        this.user = user || new SignInUserInfo();
    }
}
