import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { IsAtLeastOneFieldRequired } from '../../constraints/IsAtLeastOneFieldRequired';

export class FollowersReq {
    @IsString()
    @IsOptional()
    username?: string;

    @IsString()
    @IsMongoId()
    @IsOptional()
    userId?: string;

    @IsAtLeastOneFieldRequired(['username', 'userId'])
    anyField?: string; // This is a dummy field for the validation to work

    @IsBoolean()
    @IsOptional()
    returnAsUsername: boolean = false;

    constructor();
    constructor(arg?: string, providedUsername?: boolean, returnAsUsername?: boolean) {
        if (providedUsername && providedUsername === true) {
            this.username = arg;
        } else {
            this.userId = arg;
        }
        
        this.returnAsUsername = returnAsUsername || false;
    }
}

