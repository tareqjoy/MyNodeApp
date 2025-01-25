export class FollowersRes {
  usernames?: string[];
  userIds?: string[];

  constructor();
  constructor(lst?: string[], isUserName?: boolean);
  constructor(usernames?: string[], userIds?: string[]);
  constructor(arg1?: string[], arg2?: string[] | boolean) {
    if (typeof arg2 === "boolean") {
      if (arg2) {
        this.usernames = arg1;
      } else {
        this.userIds = arg1;
      }
    } else {
      this.usernames = arg1;
      this.userIds = arg2;
    }
  }
}
