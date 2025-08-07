
export class ProfilePhotoRes {
  photoPath: string;

  constructor();
  constructor(photoPath: string);
  constructor(photoPath?: string) {
    this.photoPath = photoPath || "";
  }
}
