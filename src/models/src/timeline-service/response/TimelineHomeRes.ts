export class TimelinePost {
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

export class TimelinePaging {
    nextToken: string; //base64 string of a json

    constructor();
    constructor(nextToken: string);
    constructor(nextToken?: string) {
        this.nextToken = nextToken || "";
    }
}

export class TimelineRes {
    posts: TimelinePost[];
    paging?: TimelinePaging;

    constructor();
    constructor(posts: TimelinePost[]);
    constructor(posts: TimelinePost[], paging?: TimelinePaging);
    constructor(posts?: TimelinePost[], paging?: TimelinePaging) {
        if (posts) {
            this.posts = posts;
        } else {
            this.posts = [];
        }
        this.paging = paging;
    }
}
