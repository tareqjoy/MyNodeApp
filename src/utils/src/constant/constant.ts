// Headers
export const ATTR_HEADER_USER_ID = "X-User-Id";

// Redis key
export const REDIS_KEY_REFRESH_TOKEN = `refresh-token:{userId}:{clientOrDeviceId}`;
export const REDIS_KEY_AUTH_CODE = `authorization-code:{authCode}`;
export const REDIS_KEY_TIMELINE_USERID = `timeline-userId:{userId}`;
export const REDIS_KEY_USERNAME_TO_USERID = `uname-uid:{username}`;
export const REDIS_KEY_USERID_TO_USERNAME = `uid-uname:{userId}`;
export const REDIS_KEY_POST_LIKE_COUNT = `post-like-count:{postId}`;