import { ValidationError } from "class-validator";

export class InvalidRequest {
  error: string = "Invalid request.";

  constructor(errorMessage: string);
  constructor(validationError: ValidationError[]);
  constructor(arg?: string | ValidationError[]) {
    if (typeof arg === "string") {
      this.error = arg;
    } else if (Array.isArray(arg) && arg.length > 0) {
      this.error = `Invalid request. ${Object.values(arg![0].constraints || "")}`;
    }
  }
}
