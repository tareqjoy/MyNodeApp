'use client'
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthRefreshReq, AuthRefreshRes } from '@tareqjoy/models'
import { plainToInstance } from 'class-transformer';

const authRefreshUrl: string = process.env.NEXT_PUBLIC_AUTH_REFRESH_URL || "/v1/auth/refresh/";

interface EnhancedAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean; 
}

let isRefreshing = false;
let subscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  subscribers.forEach((callback) => callback(token));
  subscribers = [];
}

function onError() {
  subscribers = [];
}

function addSubscriber(callback: (token: string) => void) {
  subscribers.push(callback);
}

export function getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
}

export function setAccessToken(accessToken: string) {
  localStorage.setItem('accessToken', accessToken);
}

export function deleteAccessToken() {
  localStorage.removeItem('accessToken');
}

export function getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
}

export function setRefreshToken(refreshToken: string) {
  localStorage.setItem('refreshToken', refreshToken);
}

export function deleteRefreshToken() {
  localStorage.removeItem('refreshToken');
}


export function setUserId(userId: string) {
  localStorage.setItem('userId', userId);
}

export function setUserName(username: string) {
  localStorage.setItem('username', username);
}

export function getUserId(): string | null {
  return localStorage.getItem('userId');
}

export function getUserName(): string | null  {
  return localStorage.getItem('username');
}

export function deleteUserId() {
  localStorage.removeItem('userId');
}

export function deleteUserName() {
  localStorage.removeItem('username');
}

export const axiosAuthClient = axios.create({
  timeout: 5000,
});

export const axiosPublicClient = axios.create({
    timeout: 5000,
});

axiosAuthClient.interceptors.request.use(
    (config: EnhancedAxiosRequestConfig) => {
      if (!config.headers || !config.headers['Authorization']) {
        const accessToken = getAccessToken(); 
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        } else {
          config.headers['Authorization'] = `Bearer REJECT_ME`;
        }
      }
        
      return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

axiosAuthClient.interceptors.response.use(
    (response: AxiosResponse) => response, // If response is successful, return it
    async (error: AxiosError) => {
      const originalRequest = error.config as EnhancedAxiosRequestConfig;
      console.debug("axiosAuthClient: intercepting after error response..");
      // If the error is 401 (Unauthorized) and not already retrying
      if (error.response?.status === 401 && !originalRequest?._retry) {
        console.debug("axiosAuthClient: got 401, so will try to get accesstoken using refresh token");
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          return Promise.reject(new AxiosError('Refresh token is missing', 'NO_REFRESH_TOKEN'));
        }
        console.debug(`axiosAuthClient: got refresh token: ${refreshToken}`);
        if (isRefreshing) {
          console.log(`axiosAuthClient: already refreshing, adding as subscriber waiting for the new accesstoken`);
          // If another refresh request is in progress, queue the request until it's completed
          return new Promise((resolve) => {
            addSubscriber((token: string) => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              resolve(axiosAuthClient(originalRequest));
            });
          });
        }
        console.debug(`axiosAuthClient: this request will try to fetch accesstoken`);
        // Start refreshing token
        originalRequest._retry = true;
        isRefreshing = true;
  
        try {
          const refreshReq = new AuthRefreshReq(refreshToken);
          const refreshResp = await axiosPublicClient.post(authRefreshUrl, refreshReq,
            {headers: {'Device-ID': 'some-unique-device-id'}}
          ); 
          const authRefreshResObj = plainToInstance(AuthRefreshRes, refreshResp.data);
          const newAccessToken = authRefreshResObj.access_token;

          console.debug(`axiosAuthClient: yay! found new accesstoken & saving into local db: ${newAccessToken}`);

          setAccessToken(newAccessToken);
  
          // Retry the failed request with the new access token
          console.debug(`axiosAuthClient: updating header with the new acesstoken`);
          axiosAuthClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
  
          console.debug(`axiosAuthClient: updating the ${subscribers.length} subscribed awaiting requests with the new acesstoken`);
          // Execute queued requests
          onRefreshed(newAccessToken);
          isRefreshing = false;
  
          return axiosAuthClient(originalRequest); // Retry original request with new token
        } catch (err) {
          console.error("axiosAuthClient: error while getting new accesstoken");
          console.warn(`axiosAuthClient: ignoring the ${subscribers.length} awaiting subscribed requests`);
          onRefreshed("");
          isRefreshing = false;
          return Promise.reject(err);
        }
      }
      console.debug("axiosAuthClient: not 401, not doing any accesstoken related work");
      return Promise.reject(error);
    }
  );
