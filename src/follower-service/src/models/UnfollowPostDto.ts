import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEqualTo } from './constraints/IsNotEqualToConstraint';


export class UnfollowPostDto {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsString()
    @IsNotEmpty()
    @IsNotEqualTo('username')
    unfollowsUsername: string = '';
}