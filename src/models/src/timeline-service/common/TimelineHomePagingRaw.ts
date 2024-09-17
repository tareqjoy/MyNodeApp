
export class TimelineHomePagingRaw {
    type: string;
    id: string;

    constructor();
    constructor(type: string, id: string);
    constructor(type?: string, id?: string) {
        this.type = type || "r";
        this.id = id || "";
    }
}
