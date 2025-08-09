
export class ProfilePhotoRes {
  photoAttachmentId: string;

  constructor();
  constructor(photoAttachmentId: string);
  constructor(photoAttachmentId?: string) {
    this.photoAttachmentId = photoAttachmentId || "";
  }
}
