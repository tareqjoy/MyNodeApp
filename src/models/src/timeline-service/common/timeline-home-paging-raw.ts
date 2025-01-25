export class TimelineHomePagingRaw {
  type: "r" | "m";
  id: string;

  constructor();
  constructor(type: "r" | "m", id: string);
  constructor(type?: "r" | "m", id?: string) {
    this.type = type || "r";
    this.id = id || "";
  }
}
