import express from 'express'
import mongoose, { Mongoose } from 'mongoose';
import { UserSchema } from '../schema/UserSchema'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { SignUpReq } from '@tareqjoy/models';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

export const createSignUpRouter = (mongoClient: Mongoose) => {
    router.get('/:', (req, res, next) => {
        res.status(200).json({
            message: "Handling GET request to /signup"
        });
    });
    
    router.post('/', async (req, res, next) => {
        logger.trace(`POST / called`);

        const signUpDto = plainToInstance(SignUpReq, req.body);
        const errors = await validate(signUpDto);
        if (errors.length > 0) {
            res.status(400).json(
                {
                    message: "Invalid request",
                    errors: errors.map((err) => ({
                        property: err.property,
                        constraints: err.constraints
                    }))
                }
            );
            return;
        }

        const User = mongoClient.model('User', UserSchema);

        const existUser = await User.findOne(
            { $or: [{username: signUpDto.username}, {email: signUpDto.email}] }
        ).exec();

        if (existUser) {
            res.status(400).json({error: "username or email already exists"});
            return;
        }
    
        const user = new User({
            _id: new mongoose.Types.ObjectId(),
            username: signUpDto.username,
            name: signUpDto.name,
            email: signUpDto.email,
            birthYear: signUpDto.birthYear
        })
    
        user.save().then(result => {
            res.status(200).json({
                message: "Signed up"
            });
        })
        .catch(err => {
            logger.error("Error while sign up", err);
            res.status(500).json({error: err});
        });
    });
    
    return router;
};

