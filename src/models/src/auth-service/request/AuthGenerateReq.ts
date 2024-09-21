import { IsMongoId, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class AuthGenerateReq {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s]+$/, { message: 'Username cannot contain spaces' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain alphanumeric characters and underscores' })
  @MaxLength(15, { message: 'Username cannot be longer than 15 characters' })
  username: string;

  @IsNotEmpty()
  @IsMongoId()
  userId: string;

  constructor();
  constructor(username: string, userId: string);
  constructor(username?: string, userId?: string) {
    this.username = username || "";
    this.userId = userId || "";
  }
}