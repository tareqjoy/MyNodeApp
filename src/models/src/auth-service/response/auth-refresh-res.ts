
export class AuthRefreshRes {
    access_token: string;
    expires_in: number;
    token_type: string = "Bearer";
    refresh_token?: string;
    
    constructor();
    constructor(accessToken: string, expiresInSec: number);
    constructor(accessToken: string, expiresInSec: number, refreshToken: string);
    constructor(accessToken?: string, expiresInSec?: number, refreshToken?: string) {
        this.access_token = accessToken || "";
        this.expires_in = expiresInSec || 0;
        this.refresh_token = refreshToken;
    }
}
