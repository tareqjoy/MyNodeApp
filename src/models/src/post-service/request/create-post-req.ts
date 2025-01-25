import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreatePostReq {
    @IsString()
    @IsNotEmpty()
    body: string = '';

    @IsNotEmpty()
    @IsNumber()
    @Type(() => Number)
    @Min(1)
    postTime: number = 0;
}