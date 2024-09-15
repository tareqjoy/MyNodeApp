
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsBoolean, IsInt, Max, IsMongoId } from 'class-validator';

export class TimelineHomeReq {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    highTime: number = Date.now();

    @IsOptional()
    @IsMongoId()
    lastPostId?: string; // Used as tiebreaker when there is multiple posts with same time

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(1000)
    limit: number = 100;

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    returnAsUsername: boolean = false;
}