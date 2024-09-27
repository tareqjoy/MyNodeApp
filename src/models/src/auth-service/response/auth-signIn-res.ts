//RFC recommendation: https://www.rfc-editor.org/rfc/rfc6749#section-4.3.3
export class AuthSignInRes {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string = "Bearer";
    
    constructor();
    constructor(accessToken: string, refreshToken: string, expiresInSec: number);
    constructor(accessToken?: string, refreshToken?: string, expiresInSec?: number) {
        this.access_token = accessToken || "";
        this.refresh_token = refreshToken || "";
        this.expires_in = expiresInSec || 0;
    }
}
