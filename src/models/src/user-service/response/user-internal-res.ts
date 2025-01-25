export class UserInternalRes {
  toUsernames?: Record<string, any>;
  toUserIds?: Record<any, any>;

  constructor();
  constructor(
    toUsernames?: Map<string, string | null>,
    toUserIds?: Map<string, string | null>,
  );
  constructor(
    toUsernames?: Map<string, string | null>,
    toUserIds?: Map<string, string | null>,
  ) {
    const mapToObject = (map: Map<any, any>): Record<string, any> => {
      return Object.fromEntries(map);
    };
    this.toUsernames = toUsernames
      ? toUsernames.size == 0
        ? undefined
        : mapToObject(toUsernames)
      : undefined;
    this.toUserIds = toUserIds
      ? toUserIds.size == 0
        ? undefined
        : mapToObject(toUserIds)
      : undefined;
  }
}
