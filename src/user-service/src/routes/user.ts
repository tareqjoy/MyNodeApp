import express from 'express'
import mongoose from '../clients/mongoClient';
import { UserSchema } from '../models/user'
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

export const createUserDetailsRouter = () => {
    router.get('/:username', async (req, res, next) => {
        logger.trace(`GET /:username called`);
        
        const username: string = req.params.username;
        const User = mongoose.model('User', UserSchema);
        
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
