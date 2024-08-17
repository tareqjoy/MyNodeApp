import express from 'express'
import mongoose from '../clients/mongoClient';
import { UserSchema } from '../models/user'
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

export const createSignUpRouter = () => {
    router.get('/:', (req, res, next) => {
        res.status(200).json({
            message: "Handling GET request to /signup"
        });
    });
    
    router.post('/', (req, res, next) => {
        logger.trace(`POST / called`);
        const User = mongoose.model('User', UserSchema);
    
        const user = new User({
            _id: new mongoose.Types.ObjectId(),
            username: req.body.username,
            name: req.body.name,
            email: req.body.email,
            birthYear: req.body.birthYear
        })
    
        user.save().then(result => {
            res.status(200).json({
                message: "Ok"
            });
        })
        .catch(err => {
            logger.error("Error while sign up", err);
            res.status(500).json({error: err});
        });
    });
    
    return router;
};

