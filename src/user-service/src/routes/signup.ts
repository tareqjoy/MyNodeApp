import express from 'express'
import mongoose from 'mongoose';
import { UserSchema } from '../models/user'

export const router = express.Router();

router.get('/:', (req, res, next) => {
    res.status(200).json({
        message: "Handling GET request to /signup"
    });
});

router.post('/', (req, res, next) => {
    console.log(`POST / called`);
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
        res.status(500).json({error: err});
    });
});