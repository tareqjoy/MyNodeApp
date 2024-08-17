import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';


export class FollowPostDto {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsString()
    @IsNotEmpty()
    followsUsername: string = '';

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    followTime: number = -1;
}