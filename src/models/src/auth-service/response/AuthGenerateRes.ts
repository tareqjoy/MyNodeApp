
export class AuthGenerateRes {
    accessToken: string;
    refreshToken: string;
    expiresInSec: number;
    tokenType: string = "Bearer";
    
    constructor();
    constructor(accessToken: string, refreshToken: string, expiresInSec: number);
    constructor(accessToken?: string, refreshToken?: string, expiresInSec?: number) {
        this.accessToken = accessToken || "";
        this.refreshToken = refreshToken || "";
        this.expiresInSec = expiresInSec || 0;
    }
}
