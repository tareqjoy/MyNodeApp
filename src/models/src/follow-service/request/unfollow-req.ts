import { IsString, IsNotEmpty } from 'class-validator';

export class UnfollowReq {
    @IsString()
    @IsNotEmpty()
    unfollowsUsername: string = '';
}