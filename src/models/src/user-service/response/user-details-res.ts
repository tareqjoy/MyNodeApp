export class UserDetailsRes {
  userId: string;
  username: string;
  name: string;
  email: string;
  birthYear: number | null;

  constructor();
  constructor(
    userId: string,
    username: string,
    name: string,
    email: string,
    birthYear?: number | null,
  );
  constructor(
    userId?: string,
    username?: string,
    name?: string,
    email?: string,
    birthYear?: number | null,
  ) {
    this.userId = userId || "";
    this.username = username || "";
    this.name = name || "";
    this.email = email || "";
    this.birthYear = birthYear ? birthYear : null;
  }
}
