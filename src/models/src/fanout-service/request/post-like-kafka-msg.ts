import { IsNotEmpty,IsString } from "class-validator";
import { LikeReq } from "../../post-service/request/like-req";
import { UnlikeReq } from "../../post-service/request/unlike-req";

export class PostLikeKafkaMsg {
  @IsString()
  @IsNotEmpty()
  type: "like" | "unlike";

  @IsString()
  @IsNotEmpty()
  userId: string;

  messageObject?: LikeReq | UnlikeReq ;

  constructor();
  constructor(type: "like" | "unlike", userId: string, messageObject: LikeReq | UnlikeReq);
  constructor(type?: "like" | "unlike", userId?: string, messageObject?: LikeReq | UnlikeReq) {
    this.type = type || "unlike";
    this.userId = userId || "";
    this.messageObject = messageObject;
  }
}
