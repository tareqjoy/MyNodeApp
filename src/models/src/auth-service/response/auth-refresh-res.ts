
export class AuthRefreshRes {
    accessToken: string;
    expiresInSec: number;
    tokenType: string = "Bearer";
    refreshToken?: string;
    
    constructor();
    constructor(accessToken: string, expiresInSec: number);
    constructor(accessToken: string, expiresInSec: number, refreshToken: string);
    constructor(accessToken?: string, expiresInSec?: number, refreshToken?: string) {
        this.accessToken = accessToken || "";
        this.expiresInSec = expiresInSec || 0;
        this.refreshToken = refreshToken;
    }
}
