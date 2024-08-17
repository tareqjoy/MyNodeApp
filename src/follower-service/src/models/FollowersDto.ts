import { IsString, IsNotEmpty } from 'class-validator';


export class FollowersDto {
    @IsString()
    @IsNotEmpty()
    username: string = '';
}