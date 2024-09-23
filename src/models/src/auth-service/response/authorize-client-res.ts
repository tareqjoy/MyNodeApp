
export class AuthorizeClientRes {
    code: string;
    expiresInSec: number;
    
    constructor();
    constructor(code: string, expiresInSec: number);
    constructor(code?: string, expiresInSec?: number) {
        this.code = code || "";
        this.expiresInSec = expiresInSec || 0;
    }
}
