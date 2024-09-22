//Getting started: https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/getting-started-js.html

import * as log4js from "log4js";

import { Client } from '@elastic/elasticsearch'

const logger = log4js.getLogger();
logger.level = "trace";

const elastic_search_host_port = process.env.ELASTIC_SEARCH_HOST_PORT || 'http://localhost:9200';
const elastic_search_username = process.env.ELASTIC_SEARCH_USERNAME || 'elastic';
const elastic_search_password= process.env.ELASTIC_SEARCH_PASSWORD|| 'elastic';

export async function connectElasticSearch(): Promise<Client> {
    const client = new Client({
        node: elastic_search_host_port, // Elasticsearch endpoint
        auth: {
          username: elastic_search_username,
          password: elastic_search_password
        }
    })

    try {
      const health = await client.cluster.health();
      logger.info('Connected to ElasticSearch, status:', health.status);
    } catch (error) {
      logger.error('Error connecting to Elasticsearch:', error);
    }

    return client;
}