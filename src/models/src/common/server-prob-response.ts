export const ServerProbStatus = {
  READY: "ready",
  NOT_READY: "not_ready",
  OK: "ok",
} as const;

export type ServerStatusType =
  (typeof ServerProbStatus)[keyof typeof ServerProbStatus];

export class ServerProbStatusResponse {
  readonly status: string;

  private constructor(status: string) {
    this.status = status;
  }

  static readonly READY = new ServerProbStatusResponse(ServerProbStatus.READY);
  static readonly NOT_READY = new ServerProbStatusResponse(
    ServerProbStatus.NOT_READY,
  );
  static readonly OK = new ServerProbStatusResponse(
    ServerProbStatus.OK,
  );

  static custom(status: string): ServerProbStatusResponse {
    return new ServerProbStatusResponse(status);
  }
}
