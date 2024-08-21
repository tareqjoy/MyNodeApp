
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class HomeReq {
    @IsString()
    @IsNotEmpty()
    username: string = '';

    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    startTime: number = 0;
}