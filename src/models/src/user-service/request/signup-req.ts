
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
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
  @MinLength(4, { message: "Name must be at least 4 characters long" })
  @MaxLength(15, { message: "Username cannot be longer than 15 characters" })
  username: string = "";

  @IsNotEmpty({ message: "Name is required" })
  @IsString({ message: "Name must be a string" })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: "Name can only contain letters, spaces, apostrophes and hyphens",
  })
  @MinLength(5, { message: "Name must be at least 5 characters long" })
  @MaxLength(50, { message: "Name cannot be longer than 50 characters" })
  name: string = "";

  @IsNotEmpty()
  @IsEmail()
  email: string = "";

  @IsNotEmpty({ message: "birthDay is required" })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Birthday must be in the format YYYY-MM-DD",
  })
  birthDay: string = "";

  @IsNotEmpty()
  @IsIn(["male", "female", "non-binary"], { message: "Gender must be either male, female, or non-binary" })
  gender: string = "";

  @IsString()
  @MinLength(6, {
    message: "Password is too short, it should be at least 6 characters long.",
  })
  @MaxLength(50, {
    message:
      "Password is too long, it should be no more than 50 characters long.",
  })
  // At least 1 uppercase, 1 lowercase, 1 digit, and 1 special character
  /*
  @Matches(
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/,
    {
      message:
        "Password is too weak. It should contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character.",
    },
  )*/
  password: string = "";

  constructor();
  constructor(username: string, email: string, password: string, name: string, birthDay: string, gender: string);
  constructor(username?: string, email?: string, password?: string, name?: string, birthDay?: string, gender?: string) {
    this.username = username || "";
    this.email = email || "";
    this.password = password || "";
    this.name = name || "";
    this.birthDay = birthDay || "";
    this.gender = gender || "";
  }
}
