import {
  getFileLogger,
  fillString,
  REDIS_KEY_POST_LIKE_COUNT,
} from "@tareqjoy/utils";
import mongoose, { InferSchemaType, Types } from "mongoose";
import axios from "axios";
import {
  PostDetailsRes,
  SinglePost,
  UserInternalReq,
  UserInternalRes,
  PostByUserPagingRaw,
  PostByUserPaging,
  SingleLike,
  NewPostKafkaMsg,
  SingleAttachment,
} from "@tareqjoy/models";
import { PostObject, PostLike, AttachmentObject, AttachmentType, VersionType, AttachmentStatus } from "@tareqjoy/clients";
import { plainToInstance } from "class-transformer";
import { RedisClientType } from "redis";

const logger = getFileLogger(__filename);

export function addPaginationToQuery(
  query: any,
  highTime?: number,
  lastPostId?: string,
  timeField: string = "time" // Default to 'time' if not provided
): any {
  if (lastPostId && highTime) {
    query = {
      ...query,
      $or: [
        { [timeField]: { $lt: highTime } }, // Dynamically use the time field
        { [timeField]: highTime, _id: { $lt: lastPostId } }, // Dynamically use the time field
      ],
    };
  } else if (highTime) {
    query = {
      ...query,
      [timeField]: { $lte: highTime }, // Dynamically use the time field
    };
  }

  logger.debug(`running this query: ${JSON.stringify(query)}`);
  return query;
}

export async function toResPosts(
  redisClient: RedisClientType<any, any, any>,
  userServiceHostUrl: string,
  dbPosts: PostObject[],
  returnOnlyPostId: boolean,
  returnAsUsername: boolean,
  myUserId: string,
  options?: {
    paging?: PostByUserPagingRaw;
  }
): Promise<PostDetailsRes> {
  const resPosts: SinglePost[] = [];
  if (returnOnlyPostId) {
    for (const dbp of dbPosts) {
      resPosts.push(new SinglePost(dbp._id.toString(), dbp.time, dbp.postType));
    }
  } else {
    resPosts.push(
      ...toSinglePost(dbPosts)
    );

    returnAsUsername && (await addUserNameToPosts(userServiceHostUrl, resPosts));
    await addILikedToPosts(myUserId, resPosts);
    await addLikeCountToPosts(redisClient, resPosts);
  }

  return new PostDetailsRes(
    resPosts,
    options?.paging
      ? new PostByUserPaging(
          Buffer.from(JSON.stringify(options.paging)).toString("base64")
        )
      : undefined
  );
}


export async function toResPostsOnly(
  dbPosts: PostObject[],
  options?: {
    paging?: PostByUserPagingRaw;
  }
): Promise<PostDetailsRes> {
  const resPosts: SinglePost[] = toSinglePost(dbPosts);
  return new PostDetailsRes(
    resPosts,
    options?.paging
      ? new PostByUserPaging(
          Buffer.from(JSON.stringify(options.paging)).toString("base64")
        )
      : undefined
  );
}


function toSinglePost(
  dbPosts: PostObject[]
): SinglePost[] {
  return dbPosts.map(
    (dbp) =>
      new SinglePost(dbp._id.toString(), dbp.time, dbp.postType, {
        userIdOrUsername: dbp.userId?.toString(),
        isUserName: false,
        body: dbp.body,
        attachments: getAttachments(dbp),
      })
  );
}

function getAttachments(dbPost: PostObject): SingleAttachment[] {
  if (!dbPost.attachments || dbPost.attachments.length === 0) return [];

  const attachments = dbPost.attachments;
  return attachments.map(
    (attachment) => {
      return new SingleAttachment(
        attachment._id.toString()
      );
    }
  );
}

function getAttachmentLink(attachment: AttachmentObject): {
  filePath: string;
  status: string;
} {
  switch (attachment.type) {
    case AttachmentType.IMAGE: {
      const version = attachment.versions.get(VersionType.MEDIUM);
      return {
        filePath: version?.filePath || "",
        status: version?.status || AttachmentStatus.FAILED, // fallback if missing
      };
    }
  }
  return { filePath: "", status: AttachmentStatus.FAILED };
}

async function addUserNameToPosts(userServiceHostUrl: string, resPosts: SinglePost[]): Promise<void> {
  const pUserResObj = await getUsernamesByIds(
    userServiceHostUrl,
    resPosts.map((post) => post.userId!)
  );
  const toUsernames = pUserResObj.toUsernames!;

  resPosts.forEach((post) => {
    // Replace userIdOrUsername with username and update flag
    const userIdStr = post.userId;
    if (userIdStr && toUsernames[userIdStr]) {
      post.username = toUsernames[userIdStr];
    }
  });
}

async function addILikedToPosts(
  myUserId: string,
  resPosts: SinglePost[]
): Promise<void> {
  const myLikeMap = await getPostsILiked(
    myUserId,
    resPosts.map((post) => post.postId)
  );

  resPosts.forEach((post) => {
    const myLike = myLikeMap.get(post.postId);
    if (myLike) {
      post.myLikeType = myLike; // Fill the singleLikes array for the post
    }
  });
}
async function addLikeCountToPosts(
  redisClient: RedisClientType<any, any, any>,
  resPosts: SinglePost[]
): Promise<void> {
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

async function getUsernamesByIds(
  userServiceHostUrl: string,
  userIds: string[]
): Promise<UserInternalRes> {
  const pUserInternalReq = new UserInternalReq(userIds, false);
  const pUserIdAxiosResponse = await axios.post(
    userServiceHostUrl,
    pUserInternalReq
  );

  return plainToInstance(UserInternalRes, pUserIdAxiosResponse.data);
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
    if (keysToLoadFromMongo.length > 0) {
      logger.debug(
        `post ids not in redis, will be looking in Mongodb count: ${keysToLoadFromMongo.length}`
      );
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

    logger.debug(
      `post ids loaded from mongodb: ${Object.keys(mongoData).length}`
    );
    // For all posts, check if they exist in Redis or MongoDB, and update Redis if necessary
    const likeCountsPromises = redisKeys.map(
      async (postRedisKey, index): Promise<[string, SingleLike[]]> => {
        const redisReactions: Record<string, number> = {};
        if (redisExistence[index] !== 0) {
          // If the post exists in Redis, return the data from Redis
          const redisReactionsData = await redisClient.hGetAll(postRedisKey);
          Object.entries(redisReactionsData).forEach(([type, count]) => {
            redisReactions[type] = parseInt(count);
          });
        } else {
          // If the post doesn't exist in Redis, load from MongoDB and then update Redis
          logger.debug(`not in redis! ${postIds[index]}`);
          const reactions = mongoData[postIds[index]] || [];
          if (reactions.length > 0) {
            const redisData: Record<string, number> = {};
            reactions.forEach((reaction) => {
              redisData[reaction.type] = reaction.count;
            });
            await redisClient.hSet(postRedisKey, redisData);

            Object.entries(redisData).forEach(([type, count]) => {
              redisReactions[type] = count;
            });
          }
        }

        // Return the result in the format expected
        const singleLikes: SingleLike[] = Object.entries(redisReactions).map(
          ([type, count]) => {
            return new SingleLike(type, count); // parseInt to convert string to number
          }
        );
        const postId = postIds[index];
        return [postId, singleLikes];
      }
    );

    // Wait for all operations (both MongoDB and Redis)
    const results: [string, SingleLike[]][] =
      await Promise.all(likeCountsPromises);
    logger.debug(
      `returning reaction results for posts: total ids: ${postIds.length}, like found on: ${JSON.stringify(results)}`
    );
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
    }).select("postId likeType"); // Select both postId and likeType

    // Create a map of postId -> likeType
    const likedPostsMap = new Map<string, string>();
    existingLikes.forEach((like) => {
      likedPostsMap.set(like.postId.toString(), like.likeType);
    });
    logger.debug(
      `returning i liked results. total ids: ${postIds.length}, i-liked: ${likedPostsMap.size}`
    );
    return likedPostsMap;
  } catch (error) {
    logger.error(`Error fetching posts I liked`, error);
    throw error;
  }
}
