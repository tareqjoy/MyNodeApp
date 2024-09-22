import { Type } from "class-transformer";
import { IsMongoId, IsNotEmpty, IsNumber, IsString } from "class-validator";

export class IUnfollowedKafkaMsg {
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsMongoId()
    unfollowsUserId: string;

    constructor()
    constructor(userId: string, unfollowsUserId: string);
    constructor(userId?: string, unfollowsUserId?: string) {
        this.userId = userId || "";
        this.unfollowsUserId = unfollowsUserId || "";
    }
};
