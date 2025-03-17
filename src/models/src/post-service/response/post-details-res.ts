export class SingleLike {
  type: string;
  count: number;

  constructor();
  constructor(type: string, count: number);
  constructor(type?: string, count?: number) {
      this.type = type || "";
      this.count = count || 0;
  }
}

export class SinglePost {
  postId: string;
  userId?: string;
  username?: string;
  body: string;
  time: number;
  likes: SingleLike[];
  myLikeType?: string;

  constructor();
  constructor(
    postId: string,
    time: number,
    options?: {
      userIdOrUsername?: string;
      isUserName?: boolean;
      body?: string;
      likes?: SingleLike[];
      myLikeType?: string;
    },
  );
  constructor(
    postId?: string,
    time?: number,
    options?: {
      userIdOrUsername?: string;
      isUserName?: boolean;
      body?: string;
      likes?: SingleLike[];
      myLikeType?: string;
    },
  ) {
    this.postId = postId || "";
    if (options?.isUserName) {
      this.username = options?.userIdOrUsername;
    } else {
      //isUserName undefined or false
      this.userId = options?.userIdOrUsername;
    }
    this.body = options?.body || "";
    this.likes = options?.likes || [];
    this.time = time || 0;
    this.myLikeType = options?.myLikeType;
  }
}

export class PostByUserPaging {
  nextToken: string; //base64 string of a json

  constructor();
  constructor(nextToken: string);
  constructor(nextToken?: string) {
    this.nextToken = nextToken || "";
  }
}

export class PostDetailsRes {
  posts: SinglePost[];
  paging?: PostByUserPaging;

  constructor();
  constructor(posts: SinglePost[]);
  constructor(posts: SinglePost[], paging?: PostByUserPaging);
  constructor(posts?: SinglePost[], paging?: PostByUserPaging) {
    if (posts) {
      this.posts = posts;
    } else {
      this.posts = [];
    }
    this.paging = paging;
  }
}
