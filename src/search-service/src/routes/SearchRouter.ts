import express from 'express'
import { Request, Response } from 'express';
import * as log4js from "log4js";

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

export const createSearchRouter = () => {
    router.post('/all', async (req, res, next) => {
        logger.trace(`POST /all called`);

        res.status(200).json("Hello World");
    });
    return router;
}

