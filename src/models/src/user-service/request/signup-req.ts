import { Transform } from "class-transformer";
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class SignUpReq {
  @IsNotEmpty()
  @IsString()
  @Matches(/^[^\s]+$/, { message: "Username cannot contain spaces" })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message:
      "Username can only contain alphanumeric characters and underscores",
  })
  @MaxLength(15, { message: "Username cannot be longer than 15 characters" })
  username: string = "";

  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: "Name can only contain letters, spaces, apostrophes and hyphens",
  })
  @MinLength(2, { message: "Name must be at least 2 characters long" })
  @MaxLength(50, { message: "Name cannot be longer than 50 characters" })
  name: string = "";

  @IsNotEmpty()
  @IsEmail()
  email: string = "";

  @IsNotEmpty({ message: "Year is required" })
  @IsInt({ message: "Year must be a number" })
  @Min(1900, { message: "Year must be at least 1900" })
  @Max(new Date().getFullYear() - 10, {
    message: `Year cannot be greater than ${new Date().getFullYear()}`,
  })
  birthYear: number = 0;

  @IsString()
  @MinLength(6, {
    message: "Password is too short, it should be at least 8 characters long.",
  })
  @MaxLength(50, {
    message:
      "Password is too long, it should be no more than 50 characters long.",
  })
  // At least 1 uppercase, 1 lowercase, 1 digit, and 1 special character
  @Matches(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
    {
      message:
        "Password is too weak. It should contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character.",
    },
  )
  password: string = "";
}
