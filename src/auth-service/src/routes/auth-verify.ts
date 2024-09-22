import express from 'express'
import * as log4js from "log4js";
import { InvalidRequest } from '@tareqjoy/models';
import { validateAccessToken } from './common/common';

const logger = log4js.getLogger();
logger.level = "trace";

const router = express.Router();

const jwt_access_secret = process.env.JWT_ACCESS_SECRET || 'test_access_secret_key_00x';

const ATTR_HEADER_AUTHORIZATION = "authorization";


export const createVerifyRouter = () => {
    router.post('/', async (req, res, next) => {
        logger.trace(`POST /verify called`);

        const validateRet = validateAccessToken(req.headers[ATTR_HEADER_AUTHORIZATION], jwt_access_secret);
        res.status(validateRet.statusCode).json(validateRet.msg);
    });
    
    return router;
};