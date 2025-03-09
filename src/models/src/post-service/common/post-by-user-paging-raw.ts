export class PostByUserPagingRaw {
  lastPostTime: number;
  lastPostId: string;

  constructor();
  constructor(lastPostTime: number, lastPostId: string);
  constructor(lastPostTime?: number, lastPostId?: string) {
    this.lastPostTime = lastPostTime || 0;
    this.lastPostId = lastPostId || "";
  }
}