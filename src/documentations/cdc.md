# Change data capture (CDC) 

## Overview
We are using MongoDB -> Kafka -> ElasticSearch with CDC. 

## Data flow
 If there is any new data or data change or old data that is not copied already, we want them to be copied in ElasticSearch.

 1. Kafka source connector connects to MongoDB using the worker.properties (i.e. connect-standalone-source.properties). [Kafka Connect doc](https://docs.confluent.io/platform/current/connect/userguide.html), [MongoDB connector doc](https://www.mongodb.com/docs/kafka-connector/current/source-connector/).
 2. Kafka sink connector connects to ElasticSearch using the worker.properties (i.e. connect-standalone-source.properties). [Kafka Connect doc](https://docs.confluent.io/platform/current/connect/userguide.html), [Elasticsearch connector doc](https://docs.confluent.io/kafka-connectors/elasticsearch/current/overview.html).
 3. MongoDB checks the offset file (file location is defined with *offset.storage.file.filename* attribute) to determine the new uncopied changes. 
 4. MongoDB publishes the data through the query of *pipeline* field (if any) defined in the connector properties. [MongoDB pipeline doc.](https://www.mongodb.com/docs/kafka-connector/current/source-connector/usage-examples/custom-pipeline/).
    Example data from MongoDB:
    ```json
    {"_id": {"_data": "8266DDC9EA000000012B0"}, "fullDocument": {"body": "New Post with old vibe", "time": 123},"ns": {"db": "mydatabase", "coll": "posts"}, "documentKey": {"_id": {"$oid": "66e5624189bc887a1ae93bf7"}}} 
    ```
 5. Connector parses the key and value for the kafka using the *output.schema.key* & *output.schema.value*. Any unmatched data with schema will be ignore. Then the ket & data is transformed according to the *transforms* field. [Connector transform doc.](https://docs.confluent.io/platform/current/connect/transforms/overview.html)
 6. The transformed key & data is sent to kafka using this topic: *topic.prefix*, *database* & *collection* attribute.
    Example data in kafka:
    ```json
    key = {"schema":{"type":"string","optional":false},"payload":"66e5624189bc887a1ae93bf7"} 
    value = {"schema":{"type":"struct","fields":[{"type":"string","optional":false,"field":"mongo_id"},{"type":"string","optional":false,"field":"body"},{"type":"int64","optional":false,"field":"time"},{"type":"string","optional":false,"field":"collection"}],"optional":false,"name":"com.mynodeapp.PostValue"},"payload":{"mongo_id":"66e5624189bc887a1ae93bf7","body":"New Post with old vibe","time":123}}
    ```
 7. ElasticSearch Sink connector gets the data from kafka using the *topics* attribute.
 8. The Kafka key is used as ElasticSearch *_id*, kafka topic as *_index* and the value as *_source*.
    Example data in ElasticSearch:
    ```json
    {
        "_index": "search.mydatabase.posts",
        "_id": "66e5624189bc887a1ae93bf7",
        "_score": 1,
        "_source": {
          "mongo_id": "66e5624189bc887a1ae93bf7",
          "body": "New Post with old vibe",
          "time": 123
        }
    }
    ```
