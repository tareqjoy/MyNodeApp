import express from 'express'
import { Mongoose } from 'mongoose';
import { UserSchema } from '../schema/UserSchema'
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

export const createUserDetailsRouter = (mongoClient: Mongoose) => {
    router.get('/:username', async (req, res, next) => {
        logger.trace(`GET /:username called`);
        
        const username: string = req.params.username;
        const User = mongoClient.model('User', UserSchema);
        
        User.findOne({ username: username }).exec().then(doc => {
            if (doc == null) {
                res.status(404).json({error: "user not found"});
            } else {
                res.status(200).json(doc);
            }
        }).catch(err => {
            logger.error("Error while finding user", err);
            res.status(500).json({error: err});
        });
    });
    return router;
};
