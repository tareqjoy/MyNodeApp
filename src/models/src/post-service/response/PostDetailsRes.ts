export class SinglePost {
    postId: string;
    userId?: string;
    username?: string;
    body?: string;
    time: number;
    
    constructor();
    constructor(postId: string, time: number, options?: {userIdOrUsername?: string, isUserName?: boolean, body?: string});
    constructor(postId?: string, time?: number, options?: {userIdOrUsername?: string,  isUserName?: boolean, body?: string}) {
        this.postId = postId || "";
        if (options?.isUserName) {
            this.username = options?.userIdOrUsername;
        } else {
            //isUserName undefined or false
            this.userId = options?.userIdOrUsername;
        }
        this.body = options?.body;
        this.time = time || 0;
    }
}

export class Paging {
    lastPostId?: string;

    constructor();
    constructor(highTime: number);
    constructor(highTime: number, lastPostId: string);
    constructor(highTime?: number, lastPostId?: string) {
        this.lastPostId = lastPostId;
    }
}

export class PostDetailsRes {
    posts: SinglePost[];
    paging?: Paging;

    constructor();
    constructor(posts: SinglePost[]);
    constructor(posts: SinglePost[], paging?: Paging);
    constructor(posts?: SinglePost[], paging?: Paging) {
        if (posts) {
            this.posts = posts;
        } else {
            this.posts = [];
        }
        this.paging = paging;
    }
}
