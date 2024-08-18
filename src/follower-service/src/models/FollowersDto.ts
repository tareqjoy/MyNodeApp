import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';


export class FollowersDto {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsBoolean()
    @IsOptional()
    returnAsUsername: boolean = false;
}