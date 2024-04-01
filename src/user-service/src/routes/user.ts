import express from 'express'
import mongoose from 'mongoose';
import { UserSchema } from '../models/user'

export const router = express.Router();

router.get('/:username', (req, res, next) => {
    console.log(`GET /:username called`);
    
    const username: string = req.params.username;
    const User = mongoose.model('User', UserSchema);

    const user = User.findOne({ username: username }).exec().then(doc => {
        res.status(200).json(doc);
    }).catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });
});