import express from 'express'
import { Session, Result } from 'neo4j-driver';
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();


export const createFollowerRouter = (neo4jSession: Session) => {
    router.get('/', (req, res, next) => {
        res.status(200).json({
            message: "Handling GET request to /follow"
        });
    });
    
    router.post('/follow', async (req, res, next) => {
        try {
            const result = await neo4jSession.run(
                'CREATE (p:Person {name: $name, age: $age}) RETURN p',
                { name: 'Alice', age: 30 }
            );
    
            result.records.forEach((record) => {
                const personNode = record.get('p');
                logger.debug(personNode.properties); // Output: { name: 'Alice', age: 30 }
              });
    
            res.status(200).json({
                message: "Handling POST request to /follow"
            });
        } catch(error) {
            logger.error("Error while follow: ", error);
            res.status(500).json(
                {error: "Internal Server Error"}
            );
            return;
        }

    });
    return router;
}
