export class ProfilePhoto {
  fileName: string;
  uploadedAt: string;

  constructor();
  constructor(fileName: string, uploadedAt: string);
  constructor(fileName?: string, uploadedAt?: string) {
    this.fileName = fileName || "";
    this.uploadedAt = uploadedAt || "";
  }
}

export class UserDetailsRes {
  userId: string;
  username: string;
  name: string;
  email: string;
  birthDay: string;
  gender: string;
  profilePhoto?: ProfilePhoto;

  constructor();
  constructor(
    userId: string,
    username: string,
    name: string,
    email: string,
    birthYear: string,
    gender: string
  );
  constructor(
    userId: string,
    username: string,
    name: string,
    email: string,
    birthYear: string,
    gender: string,
    profilePhoto?: ProfilePhoto
  );
  constructor(
    userId?: string,
    username?: string,
    name?: string,
    email?: string,
    birthDay?: string,
    gender?: string,
    profilePhoto?: ProfilePhoto
  ) {
    this.userId = userId || "";
    this.username = username || "";
    this.name = name || "";
    this.email = email || "";
    this.birthDay = birthDay || "" ;
    this.gender = gender || "";
    this.profilePhoto = profilePhoto;
  }
}
