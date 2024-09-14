import { Client } from '@elastic/elasticsearch';
import express from 'express'
import { Request, Response } from 'express';
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const es_index_to_search_json = process.env.ELASTIC_SEARCH_INDEX_TO_SEARCH_JSON || '["search.*"]';

const router = express.Router();

export const createSearchRouter = (client: Client) => {
    router.post('/all', async (req, res, next) => {
        logger.trace(`POST /all called`);

        const searchIndices: string[] = JSON.parse(es_index_to_search_json);
        const searchRes = await client.search({
            index: searchIndices,
            query: {
                multi_match: {
                    query: "vibe16"
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
        
        logger.info(searchIds)

        res.status(200).json(searchRes);
    });
    return router;
}

