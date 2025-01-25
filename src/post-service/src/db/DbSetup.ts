import { MongoClient } from "mongodb";

async function setupDatabase(createIndex: boolean, createShard: boolean) {
  const mongoUrl = `mongodb://admin:admin@127.0.0.1:27017/mydatabase`;

  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db("mydatabase");

  if (createIndex) {
    await db.collection("posts").createIndex({ userid: 1, time: -1 });
    await db.collection("posts").createIndex({ userid: 1 });
    console.log("Indexes created successfully.");
  }

  if (createShard) {
    // doesn't work
    await db.admin().command({ enableSharding: "mydatabase" });
    console.log("Sharding enabled for mydatabase");

    await db.admin().command({
      shardCollection: "mydatabase.posts",
      key: { userid: 1, time: -1 },
    });

    console.log("Shard created successfully.");
  }

  await client.close();
}

const args = process.argv.slice(2);

const shouldCreateIndex = args.includes("--create-index");
const shouldCreateShard = args.includes("--create-shard");

setupDatabase(shouldCreateIndex, shouldCreateShard);

// npm run setup:db:createIndex
