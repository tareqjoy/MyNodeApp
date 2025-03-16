export class CheckUsernameResponse {
  available: boolean = false;

  constructor();
  constructor(available: boolean);
  constructor(available?: boolean) {
    this.available = available || false;
  }
}
