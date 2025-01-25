import { IsBoolean, IsMongoId, IsOptional, IsString } from "class-validator";

export class AuthSignoutReq {
  @IsBoolean()
  @IsOptional()
  allDevices?: boolean;
}
