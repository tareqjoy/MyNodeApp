

export class UserLike {
    type: string;
    userId?: string;
    username?: string;

    constructor();
    constructor(type: string, options: {userId?: string, username?: string});
    constructor(type?: string, options?: {userId?: string, username?: string}) {
        this.type = type || "";
        this.userId = options?.userId;
        this.username = options?.username;
    }
}

export class WhoLikedRes {
    likes: UserLike[];
    pageToken?: string;

    constructor();
    constructor(likes: UserLike[]);
    constructor(likes: UserLike[], pageToken: string);
    constructor(likes?: UserLike[], pageToken?: string) {
        this.likes = likes || [];
        this.pageToken = pageToken;
    }
}