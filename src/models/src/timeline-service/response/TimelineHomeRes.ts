export class TimelineHomePost {
    postId: string;
    time: number;
    
    constructor();
    constructor(postId: string, time: number);
    constructor(postId?: string, time?: number) {
        this.postId = postId || "";
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
