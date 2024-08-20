export class SinglePost {
    userId?: string;
    username?: string;
    body: string;
    time: number;
    
    constructor();
    constructor(userIdOrUsername: string, body: string, time: number, isUserName: boolean);
    constructor(userIdOrUsername?: string, body?: string, time?: number, isUserName?: boolean) {
        if (isUserName) {
            this.username = userIdOrUsername;
        } else {
            this.userId = userIdOrUsername;
        }
        this.body = body || "";
        this.time = time || 0;
    }
}

export class PostDetailsRes {
    posts: SinglePost[];

    constructor();
    constructor(posts: SinglePost[]);
    constructor(posts?: SinglePost[]) {
        if (posts) {
            this.posts = posts;
        } else {
            this.posts = [];
        }
    }
}
