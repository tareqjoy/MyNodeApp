import { Client } from "@elastic/elasticsearch";
import express from "express";
import { getFileLogger } from "@tareqjoy/utils";
import { SearchReq, InvalidRequest, SearchRes, SearchResUser, SearchResPost } from "@tareqjoy/models";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const logger = getFileLogger(__filename);

const es_index_users =
  process.env.ELASTIC_SEARCH_INDEX_TO_SEARCH_JSON || "search.mydatabase.users";
const es_index_posts =
  process.env.ELASTIC_SEARCH_INDEX_TO_SEARCH_JSON || "search.mydatabase.posts";

const router = express.Router();

export const createAllRouter = (client: Client) => {
  router.post("/", async (req, res, next) => {
    logger.silly(`POST /all called`);

    const searchReq = plainToInstance(SearchReq, req.body);
    const errors = await validate(searchReq);

    if (errors.length > 0) {
      res.status(400).json(new InvalidRequest(errors));
      return;
    }

    try {
      let userResults: SearchResUser[] | undefined;
      let postResults: SearchResPost[] | undefined;
  
      if (searchReq.allToken) {
        userResults = await searchElasticInUsers(client, searchReq.allToken);
        postResults = await searchElasticInPosts(client, searchReq.allToken);
      } else if (searchReq.userToken) {
        userResults = await searchElasticInUsers(client, searchReq.userToken);
      } else if (searchReq.postToken) {
        postResults = await searchElasticInPosts(client, searchReq.postToken);
      }

      res
        .status(200)
        .json(
          new SearchRes({
            userResults: userResults,
            postResults: postResults,
          }),
        );
    } catch (error) {
      logger.error("Error while /all: ", error);
      res.status(500).json({ error: error });
    }
  });
  return router;
};

async function searchElasticInUsers(client: Client, query: string): Promise<SearchResUser[]> {
  try {
    const searchResponse = await client.search(getUserSearchQuery(query));

    const searchRes: SearchResUser[] = [];

    for (const item of searchResponse.hits.hits) {
      const sourceAndHighlightMerged: Record<string, any> = mergeSourceAndHighlight(item);
      searchRes.push(new SearchResUser(sourceAndHighlightMerged["mongo_id"], sourceAndHighlightMerged["username"], sourceAndHighlightMerged["name"] ));
    }

    return searchRes;
  } catch (error) {
    return [];
  }
}

async function searchElasticInPosts(client: Client, query: string): Promise<SearchResPost[]> {
  try {
    const searchResponse = await client.search(getPostSearchQuery(query));

    const searchRes: SearchResPost[] = [];

    for (const item of searchResponse.hits.hits) {
      const sourceAndHighlightMerged: Record<string, any> = mergeSourceAndHighlight(item);
      searchRes.push(new SearchResPost(sourceAndHighlightMerged["mongo_id"], sourceAndHighlightMerged["body"], sourceAndHighlightMerged["time"] ));
    }

    return searchRes;
  } catch (error) {
    return [];
  }
}

const mergeSourceAndHighlight = (result: any): Record<string, any> => {
  const merged: Record<string, any> = { ...result._source };

  if (result.highlight) {
    for (const [key, value] of Object.entries(result.highlight)) {
      // Assert that value is of type string[]
      const highlightValue = value as string[];

      // Replace _source field if it's present in highlight, otherwise add it
      merged[key] = highlightValue[0]; // Taking the first highlighted fragment
    }
  }

  return merged;
};

const getUserSearchQuery = (query: string) => ({
  index: es_index_users,
  body: {
    query: {
      bool: {
        should: [
          { match: { name: { query, fuzziness: "AUTO" } } },
          { match_phrase: { username: query } }
        ],
        minimum_should_match: 1
      }
    },
    highlight: {
      fields: {
        name: { 
          fragment_size: 15,
          number_of_fragments: 1,
        },
        username: {} // Enable highlighting for username
      },
      pre_tags: ["<mark>"],
      post_tags: ["</mark>"]
    },
    size: 10
  }
});

/**
 * Get Post Search Query
 * Partial match for `body`
 */
const getPostSearchQuery = (query: string) => ({
  index: es_index_posts,
  body: {
    query: {
      multi_match: {
        query,
        type: "best_fields",
        fields: ["body"],
        operator: "or",
        fuzziness: "AUTO"
      }
    },
    highlight: {
      fields: {
        "*": { 
          fragment_size: 15,
          number_of_fragments: 1,
        }
      },
      pre_tags: ["<mark>"],
      post_tags: ["</mark>"]
    },
    size: 10
  }
});