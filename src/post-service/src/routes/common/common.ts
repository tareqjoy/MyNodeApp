import {
  getFileLogger,
  fillString,
  REDIS_KEY_POST_LIKE_COUNT,
} from "@tareqjoy/utils";
import mongoose, { Types } from "mongoose";
import axios from "axios";
import {
  PostDetailsRes,
  SinglePost,
  UserInternalReq,
  UserInternalRes,
  PostByUserPagingRaw,
  PostByUserPaging,
  PostLike,
  SingleLike,
} from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { RedisClientType } from "redis";

const logger = getFileLogger(__filename);

export function getTimeSortedGetPostIdsByUserListQuery(
  userMongoIds: mongoose.Types.ObjectId[],
  highTime: number,
  lastPostId?: string
): any {
  var query: any = {
    userId: { $in: userMongoIds },
  };

  if (lastPostId) {
    query = {
      ...query,
      $or: [
        { time: { $lt: highTime } },
        { time: highTime, _id: { $lt: lastPostId } },
      ],
    };
  } else {
    query = {
      ...query,
      time: { $lte: highTime },
    };
  }
  logger.info(`running this query: ${JSON.stringify(query)}`);
  return query;
}

export async function toResPosts(
  redisClient: RedisClientType<any, any, any>,
  userServiceHostUrl: string,
  dbPosts: any,
  returnOnlyPostId: boolean,
  returnAsUsername: boolean,
  options?: {
    paging?: PostByUserPagingRaw,
    myUserId?: string
  }
): Promise<PostDetailsRes> {
  const resPosts: SinglePost[] = [];
  if (returnOnlyPostId) {
    for (const dbp of dbPosts) {
      resPosts.push(new SinglePost(dbp.id, dbp.time));
    }
  } else {
    if (returnAsUsername) {
      const pUserIds: string[] = [];

      for (const dbp of dbPosts) {
        pUserIds.push(dbp.userId!.toString());
      }

      const pUserInternalReq = new UserInternalReq(pUserIds, false);
      const pUserIdAxiosResponse = await axios.post(
        userServiceHostUrl,
        pUserInternalReq
      );

      const pUserResObj = plainToInstance(
        UserInternalRes,
        pUserIdAxiosResponse.data
      );

      for (const dbp of dbPosts) {
        resPosts.push(
          new SinglePost(dbp.id, dbp.time, {
            userIdOrUsername: pUserResObj.toUsernames![dbp.userId?.toString()],
            isUserName: true,
            body: dbp.body,
          })
        );
      }
    } else {
      for (const dbp of dbPosts) {
        resPosts.push(
          new SinglePost(dbp.id, dbp.time, {
            userIdOrUsername: dbp.userId?.toString(),
            isUserName: false,
            body: dbp.body,
          })
        );
      }
    }


    if(options?.myUserId) {
      const myLikeMap = await getPostsILiked(
        options.myUserId,
        resPosts.map((post) => post.postId)
      );

      resPosts.forEach((post) => {
        const myLike = myLikeMap.get(post.postId);
        if (myLike) {
          post.myLikeType = myLike; // Fill the singleLikes array for the post
        } 
      });

    }
    const postReactionCount = await getPostLikeCount(
      redisClient,
      resPosts.map((post) => post.postId)
    );
    resPosts.forEach((post) => {
      const likes = postReactionCount.get(post.postId);
      if (likes) {
        post.likes = likes; // Fill the singleLikes array for the post
      } else {
        logger.warn(`No likes found for postId: ${post.postId}`);
      }
    });
  }
  if (options?.paging) {
    const pagingJsonString = JSON.stringify(options.paging);
    const nextPageToken = Buffer.from(pagingJsonString).toString("base64");
    return new PostDetailsRes(resPosts, new PostByUserPaging(nextPageToken));
  } else {
    return new PostDetailsRes(resPosts);
  }
}

export async function getPostLikeCount(
  redisClient: RedisClientType<any, any, any>,
  postIds: string[]
): Promise<Map<string, SingleLike[]>> {
  const redisKeys = postIds.map((postId) =>
    fillString(REDIS_KEY_POST_LIKE_COUNT, { postId })
  );
  logger.debug(`Got posts to check like count: ${postIds.length}`);
  try {
    // Check Redis for all keys in parallel
    const redisExistence = await Promise.all(
      redisKeys.map((key) => redisClient.exists(key))
    );
    
    const keysToLoadFromMongo = postIds.filter(
      (_, index) => redisExistence[index] === 0
    );
    if(keysToLoadFromMongo.length > 0) {
      logger.debug(`post ids not in redis, will be looking in Mongodb count: ${keysToLoadFromMongo.length}`);
    }

    let mongoData: Record<string, SingleLike[]> = {};

    // If there are posts to load from MongoDB, query in bulk
    if (keysToLoadFromMongo.length > 0) {
      const objectIds = keysToLoadFromMongo.map((id) => new Types.ObjectId(id));
      const mongoResults = await PostLike.aggregate([
        { $match: { postId: { $in: objectIds } } },
        {
          $group: {
            _id: { postId: "$postId", likeType: "$likeType" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            postId: "$_id.postId",
            likeType: "$_id.likeType",
            count: 1,
            _id: 0,
          },
        },
      ]);

      // Format MongoDB results
      mongoResults.forEach((reaction) => {
        if (!mongoData[reaction.postId]) {
          mongoData[reaction.postId] = [];
        }
        mongoData[reaction.postId].push(
          new SingleLike(reaction.likeType, reaction.count)
        );
      });
    }

    logger.debug(`post ids loaded from mongodb: ${Object.keys(mongoData).length}`);
    // For all posts, check if they exist in Redis or MongoDB, and update Redis if necessary
    const likeCountsPromises = redisKeys.map(
      async (postRedisKey, index): Promise<[string, SingleLike[]]> => {
        const redisReactions: Record<string, string> = {};
        if (redisExistence[index] !== 0) {
          // If the post exists in Redis, return the data from Redis
          const redisReactionsData = await redisClient.hGetAll(postRedisKey);
          Object.entries(redisReactionsData).forEach(([type, count]) => {
            redisReactions[type] = count;
          });
        } else {
          // If the post doesn't exist in Redis, load from MongoDB and then update Redis
          logger.debug(`not in redis! ${postIds[index]}`)
          const reactions = mongoData[postIds[index]] || [];
          for (const reaction of reactions) {
            await redisClient.hIncrBy(
              postRedisKey,
              reaction.type,
              reaction.count
            );
            redisReactions[reaction.type] = String(reaction.count); // Store updated count
          }
        }

        // Return the result in the format expected
        const singleLikes: SingleLike[] = Object.entries(redisReactions).map(
          ([type, count]) => {
            return new SingleLike(type, parseInt(count)); // parseInt to convert string to number
          }
        );
        const postId = postIds[index];
        return [postId, singleLikes];
      }
    );

    // Wait for all operations (both MongoDB and Redis)
    const results = await Promise.all(likeCountsPromises);
    logger.debug(`returning reaction results for posts: total ids: ${postIds.length}, like found on: ${results.length}`);
    return new Map<string, SingleLike[]>(results);
  } catch (error) {
    logger.error(`Error fetching post like counts`, error);
    throw error;
  }
}


export async function getPostsILiked(
  userId: string,
  postIds: string[]
): Promise<Map<string, string>> {
  try {
    const postObjectIds = postIds.map((id) => new Types.ObjectId(id));

    // Query MongoDB for matching likes
    const existingLikes = await PostLike.find({
      userId: new Types.ObjectId(userId),
      postId: { $in: postObjectIds },
    }).select('postId likeType'); // Select both postId and likeType

    // Create a map of postId -> likeType
    const likedPostsMap = new Map<string, string>();
    existingLikes.forEach((like) => {
      likedPostsMap.set(like.postId.toString(), like.likeType);
    });
    logger.debug(`returning i liked results. total ids: ${postIds.length}, i-liked: ${likedPostsMap.size}`);
    return likedPostsMap;
  } catch (error) {
    logger.error(`Error fetching posts I liked`, error);
    throw error;
  }
}