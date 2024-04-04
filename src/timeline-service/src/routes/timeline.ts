import express from 'express'
import mongoose from 'mongoose';
import { PostSchema } from '../models/post'
import axios, { AxiosResponse } from 'axios';


export const router = express.Router();
const userServiceHostUrl: string = process.env.USER_SERVICE_USERID_URL || "http://127.0.0.1:5001/userid/v1/";

router.get('/:username', (req, res, next) => {
    console.log(`GET /:username called`);
    
    const username: string = req.params.username;

    axios.get(userServiceHostUrl + username).then((reponse: AxiosResponse) => {
        return reponse.data.id
    }).then((userid: string) => {
        const Post = mongoose.model('Post', PostSchema);
        Post.find({ userid: userid }).sort( { time: -1 }).limit(10).exec().then(doc => {
            if (doc == null) {
                res.status(404).json({error: "no post found"});
            } else {
                res.status(200).json(doc);
            }
        })
    }).catch(err => {
        console.log(err);
        res.status(500).json({error: err});
    });;

});

router.post('/', (req, res, next) => {
    console.log(`POST / called`);

    const username = req.body.username


    axios.get(userServiceHostUrl + username).then((reponse: AxiosResponse) => {
        return reponse.data.id
    }).then((userid: string) => {
        const Post = mongoose.model('Post', PostSchema);

        const post = new Post({
            _id: new mongoose.Types.ObjectId(),
            userid: userid,
            body: req.body.body,
            time: Date.now()
        })

        post.save().then(result => {
            res.status(200).json({
                message: "Ok"
            });
        })

    }).catch((err: any) => {
        // Handle error
        console.error(err);
        res.status(500).json({error: err});
    });
});