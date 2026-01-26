import { getFileLogger } from "@tareqjoy/utils";

import { createClient, type RedisClientType, type RespVersions } from "redis";


const logger = getFileLogger(__filename);

const redis_host_port =
  process.env.REDIS_HOST_PORT || "redis://0.0.0.0:6379";

export async function connectRedis(): Promise<
  RedisClientType<any, any, any, RespVersions>
> {
  const redisClient = createClient({ url: redis_host_port });

  redisClient.on("error", (err) => logger.error("Redis client error: ", err));
  redisClient.on("ready", () => logger.info("Redis client is ready"));

  await redisClient.connect();
  return redisClient;
}
