import express from 'express'
import mongoose, { Mongoose } from 'mongoose';
import { UserSchema } from '../schema/UserSchema'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { AuthGenerateReq, AuthGenerateRes, SignInReq, SignInRes, SignInUserInfo } from '@tareqjoy/models';
import { InternalServerError, InvalidRequest } from '@tareqjoy/models';
import axios from "axios";
import { validate } from 'class-validator';
import argon2 from 'argon2';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const authGenUrl: string = process.env.GET_POST_BY_USER_URL || "http://127.0.0.1:5007/v1/auth/generate/";

const ATTR_HEADER_DEVICE_ID = "device-id";

export const createSignInRouter = (mongoClient: Mongoose) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST / called`);

        const deviceId = req.headers[ATTR_HEADER_DEVICE_ID];

        if(!deviceId || typeof deviceId !== 'string') {
            res.status(400).json(new InvalidRequest(`Header ${ATTR_HEADER_DEVICE_ID} is required`));
            return;
        }

        const signInObj = plainToInstance(SignInReq, req.body);
        const errors = await validate(signInObj);
        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }

        try {
            const User = mongoClient.model('User', UserSchema);

            const dbUser = await User.findOne(
                { $or: [{username: signInObj.username}, {email: signInObj.email}] },
                { username: 1, id: 1, password: 1}
            ).exec();
    
            if (!dbUser) {
                res.status(404).json(new InvalidRequest("username or email doesn't exist"));
                return;
            }
    
            if (dbUser.password && !await argon2.verify(dbUser.password, signInObj.password)) {
                res.status(403).json(new InvalidRequest("wrong password"));
                return;
            }
    
            const authGenReqObj = new AuthGenerateReq(dbUser.username, dbUser.id.toString());
            const authGenResp = await axios.post(authGenUrl, authGenReqObj, {headers: { [ATTR_HEADER_DEVICE_ID]: [deviceId]}});
            const authGenRespObj = plainToInstance(AuthGenerateRes, authGenResp.data);

            const userInfo = new SignInUserInfo(dbUser.id.toString(), dbUser.username); 
            res.status(200).json(new SignInRes(authGenRespObj, userInfo));
        } catch(error) {
            logger.error("Error while sign in", error);
            res.status(500).json(new InternalServerError());
        }

    });
    
    return router;
};

