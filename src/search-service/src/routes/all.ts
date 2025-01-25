import { Client } from '@elastic/elasticsearch';
import express from 'express'
import * as log4js from "log4js";
import { SearchReq, InvalidRequest, SearchRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

const logger = log4js.getLogger();
logger.level = "trace";

const es_index_users = process.env.ELASTIC_SEARCH_INDEX_TO_SEARCH_JSON || 'search.mydatabase.users';
const es_index_posts = process.env.ELASTIC_SEARCH_INDEX_TO_SEARCH_JSON || 'search.mydatabase.posts';

const router = express.Router();

export const createAllRouter = (client: Client) => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /all called`);

        const searchReq = plainToInstance(SearchReq, req.body);
        const errors = await validate(searchReq);

        if (errors.length > 0) {
            res.status(400).json(new InvalidRequest(errors));
            return;
        }
        const searchIndices: string[] = [];
        var searchQuery = '';

        if (searchReq.allToken) {
            searchIndices.push(es_index_users);
            searchIndices.push(es_index_posts);
            searchQuery = searchReq.allToken;
        } else if (searchReq.userToken) {
            searchIndices.push(es_index_users);
            searchQuery = searchReq.userToken;
        } else if (searchReq.postToken) {
            searchIndices.push(es_index_posts);
            searchQuery = searchReq.postToken;
        }

        try {
            const searchRes = await client.search({
                index: searchIndices,
                query: {
                    multi_match: {
                        query: searchQuery
                    }
                }
            });
    
            const searchIds: Map<string, string[]> = new Map();
    
            for (const item of searchRes.hits.hits) {
                if (!searchIds.has(item._index)) {
                    searchIds.set(item._index, []);
                }
                const source = item._source as any;
                searchIds.get(item._index)!.push(source.mongo_id);
            }
    
            res.status(200).json(new SearchRes({userIds: searchIds.get(es_index_users), postIds: searchIds.get(es_index_posts)}));
        }  catch(error) {
            logger.error("Error while /all: ", error);
            res.status(500).json({error: error});
        }
    });
    return router;
}

