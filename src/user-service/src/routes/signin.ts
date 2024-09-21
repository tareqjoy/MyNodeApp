import express from 'express'
import mongoose, { Mongoose } from 'mongoose';
import { UserSchema } from '../schema/UserSchema'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { SignInReq, SignInRes, SignInUserInfo } from '@tareqjoy/models';
import { InternalServerError, InvalidRequest } from '@tareqjoy/models';
import { RedisClientType } from 'redis';
import { validate } from 'class-validator';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';
const jwt_access_expires = process.env.JWT_ACCESS_EXPIRES || '15m';
const jwt_refresh_secret = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_00x';
const jwt_refresh_expires = process.env.JWT_REFRESH_EXPIRES || '7d';

export const createSignInRouter = (mongoClient: Mongoose, redisClient: RedisClientType<any, any, any>) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST / called`);

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
                { username: 1, email: 1, password: 1}
            ).exec();
    
            if (!dbUser) {
                res.status(404).json(new InvalidRequest("username or email doesn't exist"));
                return;
            }
    
            if (dbUser.password && !await argon2.verify(dbUser.password, signInObj.password)) {
                res.status(403).json(new InvalidRequest("wrong password"));
                return;
            }
    
            const accessToken = jwt.sign({email: dbUser.email, username: dbUser.username}, jwt_access_secret, { expiresIn: jwt_access_expires });
            const refreshToken = jwt.sign({email: dbUser.email}, jwt_refresh_secret, { expiresIn: jwt_refresh_expires });
    
            const userInfo = new SignInUserInfo(dbUser.username, dbUser.email); 
            res.status(200).json(new SignInRes(accessToken, refreshToken, jwt_access_expires, userInfo));
        } catch(error) {
            logger.error("Error while sign in", error);
            res.status(500).json(new InternalServerError());
        }

    });
    
    return router;
};

