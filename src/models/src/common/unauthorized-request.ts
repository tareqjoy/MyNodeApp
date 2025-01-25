export class UnauthorizedRequest {
  error: string = "Unauthorized";

  constructor();
  constructor(message: string);
  constructor(arg?: string) {
    if (arg) {
      this.error = arg;
    }
  }
}
