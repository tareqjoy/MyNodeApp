
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';

export class TimelineHomeReq {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    startTime: number = Date.now();

    @IsBoolean()
    @IsOptional()
    @Type(() => Boolean)
    returnAsUsername: boolean = false;
}