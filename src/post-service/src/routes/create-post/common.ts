import { Post } from "@tareqjoy/clients";
import { NewPostKafkaMsg } from "@tareqjoy/models";
import { getFileLogger } from "@tareqjoy/utils";
import { Producer } from "kafkajs";
import mongoose, { Mongoose } from "mongoose";


const logger = getFileLogger(__filename);

export async function writePost(
  loggedInUserId: string,
  body: string,
  postTime: number,
  attachmentIds: string[] | undefined,
  postType: string,
  newPostKafkaProducer: Producer,
  fanoutTopic: string
): Promise<String> {
  const post = new Post({
    _id: new mongoose.Types.ObjectId(),
    userId: loggedInUserId,
    body: body,
    time: postTime,
    attachments: attachmentIds?.map((id) => new mongoose.Types.ObjectId(id)),
    postType: postType,
  });

  const dbResult = await post.save();
  logger.debug(`saved to mongodb with postId: ${dbResult.id}`);

  const kafkaMsg = new NewPostKafkaMsg(
    dbResult.id,
    dbResult.userId!.toString(),
    dbResult.time,
    dbResult.postType,
    dbResult.attachments!.map((id) => id.toString())
  );
  logger.debug(`kafka message created: `, kafkaMsg
  );
  logger.debug(`publishing Kafka: topic: ${fanoutTopic}`);
  await newPostKafkaProducer.send({
    topic: fanoutTopic,
    messages: [
      {
        key: dbResult.id,
        value: JSON.stringify(kafkaMsg),
      },
    ],
  });
  return dbResult.id.toString;
}
