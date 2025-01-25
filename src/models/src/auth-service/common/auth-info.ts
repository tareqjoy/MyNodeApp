export class AuthInfo {
  userId: string;

  constructor();
  constructor(userId: string);
  constructor(userId?: string) {
    this.userId = userId || "";
  }
}
