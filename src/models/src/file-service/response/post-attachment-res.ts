
export class ProfileAttachmentRes {
  filePaths: string[];

  constructor();
  constructor(filePaths: string);
  constructor(filePaths: string[]);
  constructor(filePaths?: string | string[]) {
    if (filePaths && typeof filePaths === "string") {
      this.filePaths = [filePaths];
    } else if (filePaths && Array.isArray(filePaths)) {
      this.filePaths = filePaths.filter((f) => typeof f === "string");
    } else {
      this.filePaths = [];
    }
  }
}
