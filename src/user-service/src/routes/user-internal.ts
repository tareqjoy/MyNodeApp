import express from 'express'
import mongoose from 'mongoose';
import { UserSchema } from '../models/user'

export const router = express.Router();

router.get('/:username', (req, res, next) => {
    console.log(`GET /:username called`);
    
    const username: string = req.params.username;
    const User = mongoose.model('User', UserSchema);

    User.findOne({ username: username }).exec().then(doc => {
        if (doc == null) {
            res.status(404).json({error: "user not found"});
        } else {
            res.status(200).json({id: doc._id});
        }
    }).catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});