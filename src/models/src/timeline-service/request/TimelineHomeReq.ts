
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsBoolean, IsInt, Max, IsMongoId } from 'class-validator';

export class TimelineHomeReq {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsOptional()
    @IsString()
    nextToken?: string; 

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Min(1)
    @Max(1000)
    limit: number = 100;
}