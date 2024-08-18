import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsMongoId } from 'class-validator';
import { IsAtLeastOneFieldRequired } from './constraints/IsAtLeastOneFieldRequired';

export class FollowersDto {
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
}

