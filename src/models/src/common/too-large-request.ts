import { ValidationError } from "class-validator";

export class TooLargeRequest {
  error: string = "Request is too large.";

  constructor();
  constructor(message: string);
  constructor(maxAllowed: number);
  constructor(arg?: string | number) {
    if (typeof arg === "string") {
      this.error = arg;
    } else if (typeof arg === "number") {
      this.error = `Request is too large, limit is: ${arg}.`;
    }
  }
}
