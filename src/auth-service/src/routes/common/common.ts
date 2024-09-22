import { AuthInfo, InvalidRequest, UnauthorizedRequest } from '@tareqjoy/models';
import jwt from 'jsonwebtoken';

const ATTR_HEADER_AUTHORIZATION = "authorization";

class ValidateResponse {
    statusCode: number;
    msg: AuthInfo | UnauthorizedRequest | InvalidRequest;

    constructor(statusCode: number, msg: AuthInfo | UnauthorizedRequest | InvalidRequest) {
        this.statusCode = statusCode;
        this.msg = msg;
    }
}

export function validateAccessToken(authHeader: any, jwt_access_secret: string): ValidateResponse {

    if(!authHeader || typeof authHeader !== 'string') {
        return new ValidateResponse(400, new InvalidRequest(`Header ${ATTR_HEADER_AUTHORIZATION} is required`));
    }

    const accessToken = authHeader && authHeader.split(' ')[1];

    if (!accessToken) {
        return new ValidateResponse(400, new InvalidRequest(`Access token missing`));
    }
    try {
        const authInfo = jwt.verify(accessToken, jwt_access_secret) as AuthInfo;
        return new ValidateResponse(200, authInfo);
    } catch(err) {
        if (err instanceof Error) {
            if (err.name === 'TokenExpiredError') {
                return new ValidateResponse(403, new UnauthorizedRequest('Access token expired'));
            }
        }
        return new ValidateResponse(400, new InvalidRequest(`Invalid access token`));
    }
}