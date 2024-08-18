import neo4j, { Driver, Session, Result } from 'neo4j-driver';
import * as log4js from "log4js";


const logger = log4js.getLogger();
logger.level = "trace";

const neo4j_host_port = process.env.NEO4J_HOST_PORT || 'neo4j://192.168.0.10:7687';
const neo4j_username = process.env.NEO4J_USERNAME || 'neo4j';
const neo4j_password= process.env.NEO4J_PASSWORD|| '12345678';

export async function connectNeo4jDriver(): Promise<Driver> {
    logger.info(`Connecting to to Neo4j driver on ${neo4j_host_port}, username: ${neo4j_username}, password: ${neo4j_password}`);

    const neo4jDriver: Driver = neo4j.driver(
        neo4j_host_port,
        neo4j.auth.basic(neo4j_username, neo4j_password)
    );

    const info = await neo4jDriver.getServerInfo();
    logger.info(`Connected to Neo4j driver on ${info.address}, agent ${info.agent}`);
    

    return neo4jDriver;
}


