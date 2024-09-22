export class UserSignInRes {
    userId: string;
    username: string;

    constructor();
    constructor(userId: string, username: string);
    constructor(userId?: string, username?: string) {
        this.userId = userId || "";
        this.username = username || "";
    }
}