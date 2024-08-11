import express from 'express'

import { RedisClientType } from 'redis'

const router = express.Router();

export const createFanoutRouter = (redisClient: RedisClientType<any, any, any>) => {
    router.get('/', async (req, res, next) => {
        const message = await redisClient.ping();
        if (message == "PONG") {
            res.status(200).json({
                message: `Hello world`
            });
        } else {
            res.status(500).json({
                message: `Redis connection failed`
            });
        }
    });
    
    router.post('/', async (req, res, next) => {
        const message = await redisClient.ping();
        if (message == "PONG") {
            res.status(200).json({
                message: `Hello world`
            });
        } else {
            res.status(500).json({
                message: `Redis connection failed`
            });
        }
    });

    return router;
}

