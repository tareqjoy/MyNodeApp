
import { Session } from 'neo4j-driver';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { Response } from 'express';
import * as log4js from "log4js";
import { FollowersReq, UserInternalReq, UserInternalRes } from '@tareqjoy/models';
import { FollowersRes } from '@tareqjoy/models';
import { InvalidRequest } from '@tareqjoy/models';
import axios from 'axios';

export async function commonFollow(userServiceHostUrl: string, neo4jSession: Session, query: string, reqBody: any, res: Response) {
    const followersDto = plainToInstance(FollowersReq, reqBody);
    const errors = await validate(followersDto);

    if (errors.length > 0) {
        res.status(400).json(new InvalidRequest(errors));
        return;
    }
    var usernameId;
    if (followersDto.username) {
        const fUserInternalReq = new UserInternalReq(followersDto.username, true);
        const fUserIdAxiosResponse = await axios.post(userServiceHostUrl, fUserInternalReq);

        const fUserResObj = plainToInstance(UserInternalRes, fUserIdAxiosResponse.data);

        if (!fUserResObj.toUserIds || !fUserResObj.toUserIds[followersDto.username]) {
            res.status(400).json(new InvalidRequest("Invalid username"));
            return;
        }
        usernameId = fUserResObj.toUserIds[followersDto.username];
    } else {
        usernameId = followersDto.userId;
    }

    const followers = await neo4jSession.run(query,{ userId: usernameId  });

    const whoFollows = [];

    for(const record of followers.records) {
        whoFollows.push(record.get('fuser').properties.userId);
    }

    if (followersDto.returnAsUsername) {
        const resultUserInternalReq = new UserInternalReq(whoFollows, false);

        const resultUserAxiosRes = await axios.post(userServiceHostUrl, resultUserInternalReq);
        const resultUserResObj = plainToInstance(UserInternalRes, resultUserAxiosRes.data);
    
        const usernames = [];
        for(const key in resultUserResObj.toUsernames) {
            usernames.push(resultUserResObj.toUsernames[key]);
        }
    
        res.status(200).json(new FollowersRes(usernames, true));
    } else {
        res.status(200).json(new FollowersRes(whoFollows, false));
    }
}