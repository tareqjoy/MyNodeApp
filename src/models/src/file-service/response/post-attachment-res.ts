
export class ProfileAttachmentRes {
  attachmentIds: string[];

  constructor();
  constructor(attachmentIds: string);
  constructor(attachmentIds: string[]);
  constructor(attachmentIds?: string | string[]) {
    if (attachmentIds && typeof attachmentIds === "string") {
      this.attachmentIds = [attachmentIds];
    } else if (attachmentIds && Array.isArray(attachmentIds)) {
      this.attachmentIds = attachmentIds.filter((f) => typeof f === "string");
    } else {
      this.attachmentIds = [];
    }
  }
}
