export class SinglePost {
    postId: string
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
