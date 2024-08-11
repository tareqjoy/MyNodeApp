import express from 'express'
import mongoose from 'mongoose';
import { PostSchema } from '../models/post'
import { FanoutKafkaMessage } from '../models/fanout-kafka-message'
import axios, { AxiosResponse } from 'axios';
import { fanoutProducer, userServiceHostUrl, kafka_fanout_topic } from '../server'
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

export const router = express.Router();


router.get('/:username', (req, res, next) => {
    logger.trace(`GET /:username called`);
    
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
        logger.error(err);
        res.status(500).json({error: err});
    });;

});

router.post('/', (req, res, next) => {
    logger.trace(`POST / called`);
        
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

        return post.save();

    }).then((result: any) => {
        const msg = new FanoutKafkaMessage(result._id.toString(), result.userid.toString(), result.time);
        logger.debug(`publishing Kafka: topic: ${kafka_fanout_topic}`);
        return fanoutProducer.send({
            topic: kafka_fanout_topic,
            messages: [
                {
                    key: msg.postId,
                    value: JSON.stringify(msg)
                }
            ]
        })
    }).then((result: any) => {
        res.status(200).json({
            message: "Ok"
        });
    })
    .catch((err: any) => {
        // Handle error
        logger.error(err);
        res.status(500).json({error: err});
    });
});