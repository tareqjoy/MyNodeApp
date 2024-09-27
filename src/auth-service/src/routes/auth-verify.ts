import express from 'express'
import * as log4js from "log4js";
import { InvalidRequest } from '@tareqjoy/models';
import { validateAccessToken } from './common/common';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const ATTR_HEADER_AUTHORIZATION = "authorization";


export const createVerifyRouter = () => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /verify called`);

        const validateRet = validateAccessToken(req.headers[ATTR_HEADER_AUTHORIZATION]);
        res.status(validateRet.statusCode).json(validateRet.msg);
    });
    
    return router;
};