export class DoIFollowResponse {
    doIFollow: boolean = false;
  
    constructor();
    constructor(doIFollow: boolean);
    constructor(doIFollow?: boolean) {
      this.doIFollow = doIFollow || false;
    }
  }
  