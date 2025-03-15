export class SearchResUser {
  userid: string;
  username: string;
  name: string;

  constructor();
  constructor(userid: string, username: string, name: string);
  constructor(userid?: string, username?: string, name?: string) {
    this.userid = userid || "";
    this.username = username || "";
    this.name = name || "";
  }
}

export class SearchResPost {
  postid: string;
  body: string;
  time: number;

  constructor();
  constructor(postid: string, body: string, time: number);
  constructor(postid?: string, body?: string, time?: number) {
    this.postid = postid || "";
    this.body = body || "";
    this.time = time || 0;
  }
}

export class SearchRes {
  userResults?: SearchResUser[];
  postResults?: SearchResPost[];

  constructor();
  constructor(options: { userResults?: SearchResUser[]; postResults?: SearchResPost[] });
  constructor(options?: { userResults?: SearchResUser[]; postResults?: SearchResPost[] }) {
    this.userResults = options?.userResults;
    this.postResults = options?.postResults;
  }
}
