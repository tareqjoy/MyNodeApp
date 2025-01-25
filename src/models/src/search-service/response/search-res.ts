export class SearchRes {
  userIds?: string[];
  postIds?: string[];

  constructor();
  constructor(options: { userIds?: string[]; postIds?: string[] });
  constructor(options?: { userIds?: string[]; postIds?: string[] }) {
    this.userIds = options?.userIds;
    this.postIds = options?.postIds;
  }
}
