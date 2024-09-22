import { IsMongoId, IsNotEmpty, IsString } from "class-validator";

export class IFollowedKafkaMsg {
    @IsString()
    @IsMongoId()
    @IsNotEmpty()
    userId: string;

    @IsString()
    @IsMongoId()
    followsUserId: string;

    constructor()
    constructor(userId: string, followsUserId: string);
    constructor(userId?: string, followsUserId?: string) {
        this.userId = userId || "";
        this.followsUserId = followsUserId || "";
    }
};
