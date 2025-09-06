import { VersionType } from "@tareqjoy/clients";

export const PROFILE_PHOTO_VARIANT_SIZES: Record<string, number> = {
  [VersionType.LARGE]: 1024,
  [VersionType.MEDIUM]: 512,
  [VersionType.SMALL]: 256,
};