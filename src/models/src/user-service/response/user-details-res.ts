export class UserDetailsRes {
  userId: string;
  username: string;
  name: string;
  email: string;
  birthDay: string;
  gender: string;

  constructor();
  constructor(
    userId: string,
    username: string,
    name: string,
    email: string,
    birthYear: string,
    gender: string,
  );
  constructor(
    userId?: string,
    username?: string,
    name?: string,
    email?: string,
    birthDay?: string,
    gender?: string,
  ) {
    this.userId = userId || "";
    this.username = username || "";
    this.name = name || "";
    this.email = email || "";
    this.birthDay = birthDay || "" ;
    this.gender = gender || "" ;
  }
}
