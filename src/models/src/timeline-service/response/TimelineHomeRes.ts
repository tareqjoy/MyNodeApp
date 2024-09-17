export class TimelineHomePost {
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

export class TimelineHomePaging {
    nextToken: string; //base64 string of a json

    constructor();
    constructor(nextToken: string);
    constructor(nextToken?: string) {
        this.nextToken = nextToken || "";
    }
}

export class TimelineHomeRes {
    posts: TimelineHomePost[];
    paging?: TimelineHomePaging;

    constructor();
    constructor(posts: TimelineHomePost[]);
    constructor(posts: TimelineHomePost[], paging?: TimelineHomePaging);
    constructor(posts?: TimelineHomePost[], paging?: TimelineHomePaging) {
        if (posts) {
            this.posts = posts;
        } else {
            this.posts = [];
        }
        this.paging = paging;
    }
}
