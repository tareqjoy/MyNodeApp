

export class AttachmentInfos {
  attachments: SingleAttachmentInfo[];

  constructor();
  constructor(attachments: SingleAttachmentInfo[]);
  constructor(attachments?: SingleAttachmentInfo[]) {
    this.attachments = attachments || [];
  }
}

export class SingleAttachmentInfo {
  id: string;
  userId: string;
  type: string;
  uploadedAt: string;
  updatedAt: string;
  versions: Record<string, VersionInfo>;

  constructor();
  constructor(
    id: string,
    userId: string,
    type: string,
    uploadedAt: Date,
    updatedAt: Date,
    versions: Record<string, VersionInfo>
  );
  constructor(
    id?: string,
    userId?: string,
    type?: string,
    uploadedAt?: Date,
    updatedAt?: Date,
    versions?: Record<string, VersionInfo>
  ) {
    this.id = id || "";
    this.userId = userId || "";
    this.type = type || "";
    this.uploadedAt = uploadedAt
      ? uploadedAt.toISOString()
      : new Date().toISOString();
    this.updatedAt = updatedAt
      ? updatedAt.toISOString()
      : new Date().toISOString();
    this.versions = versions || {};
  }
}

export class VersionInfo {
  filePath: string;
  status: string;
  manifestUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    bitrate?: number;
    codec?: string;
  };

  constructor();
  constructor(filePath: string, status: string);
  constructor(
    filePath: string,
    status: string,
    options?: {
      manifestUrl?: string;
      metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        bitrate?: number;
        codec?: string;
      };
    }
  );
  constructor(
    filePath: string,
    status: string,
    options?: {
      manifestUrl?: string;
      metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        bitrate?: number;
        codec?: string;
      };
    }
  );
  constructor(
    filePath?: string,
    status?: string,
    options?: {
      manifestUrl?: string;
      metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        bitrate?: number;
        codec?: string;
      };
    }
  ) {
    this.filePath = filePath || "";
    this.status = status || "uploaded";
    this.manifestUrl = options?.manifestUrl;
    this.metadata = options?.metadata;
  }
}
