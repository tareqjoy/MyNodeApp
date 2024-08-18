import * as log4js from "log4js";

import { createClient, RedisClientType } from 'redis'

const logger = log4js.getLogger();
logger.level = "trace";

const redis_host_port = process.env.REDIS_HOST_PORT || 'redis://192.168.0.10:6379';

export async function connectRedis(): Promise<RedisClientType<any, any, any>> {
    const redisClient = createClient( { url: redis_host_port });

    redisClient.on('error', err => logger.error('Redis client error: ', err));
    redisClient.on('ready', () => logger.info('Redis client is ready'));
    
    await redisClient.connect();
    return redisClient;
}
