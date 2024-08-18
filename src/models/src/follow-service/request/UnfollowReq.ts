import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEqualTo } from '../../constraints/IsNotEqualTo';

export class UnfollowReq {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsString()
    @IsNotEmpty()
    @IsNotEqualTo('username')
    unfollowsUsername: string = '';
}