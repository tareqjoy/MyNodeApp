export class TrendingPost {
  postId: string;
  score: number;

  constructor();
  constructor(postId: string, score: number);
  constructor(postId?: string, score?: number) {
    this.postId = postId || "";
    this.score = score || 0;
  }
}

export class TrendingRes {
  window: string;
  posts: TrendingPost[];

  constructor();
  constructor(window: string, posts: TrendingPost[]);
  constructor(window?: string, posts?: TrendingPost[]) {
    this.window = window || "24h";
    this.posts = posts || [];
  }
}
