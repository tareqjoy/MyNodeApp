export class SinglePost {
    postId: string
    userId?: string;
    username?: string;
    body: string;
    time: number;
    
    constructor();
    constructor(postId: string, userIdOrUsername: string, body: string, time: number, isUserName: boolean);
    constructor(postId?: string, userIdOrUsername?: string, body?: string, time?: number, isUserName?: boolean) {
        this.postId = postId || "";
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
