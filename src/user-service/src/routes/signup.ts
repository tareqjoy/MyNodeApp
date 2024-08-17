import express from 'express'
import mongoose from '../clients/mongoClient';
import { UserSchema } from '../models/user'
import * as log4js from "log4js";
import { plainToInstance } from 'class-transformer';
import { SignUpDto } from '../models/SignUpDto';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

export const createSignUpRouter = () => {
    router.get('/:', (req, res, next) => {
        res.status(200).json({
            message: "Handling GET request to /signup"
        });
    });
    
    router.post('/', async (req, res, next) => {
        logger.trace(`POST / called`);

        const signUpDto = plainToInstance(SignUpDto, req.body);
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

        const User = mongoose.model('User', UserSchema);

        const existUser = await User.findOne({ username: signUpDto.username}).exec();

        if (existUser) {
            res.status(400).json({error: "username already exists"});
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

