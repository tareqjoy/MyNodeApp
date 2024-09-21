import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { IsAtLeastOneFieldRequired } from '../../constraints/IsAtLeastOneFieldRequired';

export class SignInReq {
  @IsString()
  @Matches(/^[^\s]+$/, { message: 'Username cannot contain spaces' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain alphanumeric characters and underscores' })
  @MaxLength(15, { message: 'Username cannot be longer than 15 characters' })
  @IsOptional()
  username?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6, { message: 'Password is too short, it should be at least 8 characters long.' })
  @MaxLength(50, { message: 'Password is too long, it should be no more than 50 characters long.' })
  password: string = "";

  @IsAtLeastOneFieldRequired(['username', 'email'])
  anyField?: string; // This is a dummy field for the validation to work
}