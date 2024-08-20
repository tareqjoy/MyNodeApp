import { Type } from "class-transformer";
import { IsNumber, IsString } from "class-validator";

export class NewPostKafkaMsg {
    @IsString()
    postId: string;

    @IsString()
    userId: string;

    @IsNumber()
    @Type(() => Number)
    postTime: number;

    constructor()
    constructor(postId: string, userId: string, postTime: number);
    constructor(postId?: string, userId?: string, postTime?: number) {
        this.postId = postId || "";
        this.userId = userId || "";
        this.postTime = postTime || 0;
    }
};
