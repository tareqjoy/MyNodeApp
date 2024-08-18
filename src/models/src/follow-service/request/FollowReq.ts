import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsNotEqualTo } from '../../constraints/IsNotEqualTo';


export class FollowReq {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsString()
    @IsNotEmpty()
    @IsNotEqualTo('username')
    followsUsername: string = '';

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    followTime: number = -1;
}