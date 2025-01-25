import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UnfollowReq {
    @IsString()
    @IsNotEmpty()
    unfollowsUsername: string = '';
}