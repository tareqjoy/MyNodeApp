'use client'
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthRefreshReq, AuthRefreshRes } from '@tareqjoy/models'
import { plainToInstance } from 'class-transformer';

const authRefreshUrl: string = process.env.NEXT_PUBLIC_AUTH_REFRESH_URL || "http://127.0.0.1:5007/v1/auth/refresh/";

interface EnhancedAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean; 
}

let isRefreshing = false;
let subscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  subscribers.forEach((callback) => callback(token));
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
      console.log("intercepting after error response..");
      // If the error is 401 (Unauthorized) and not already retrying
      if (error.response?.status === 401 && !originalRequest?._retry) {
        console.log("got 401");
        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          return Promise.reject(new AxiosError('Refresh token is missing', 'NO_REFRESH_TOKEN'));
        }
        console.log(`got refresh token: ${refreshToken}`);
        if (isRefreshing) {
          console.log(`already refreshing, skipping further`);
          // If another refresh request is in progress, queue the request until it's completed
          return new Promise((resolve) => {
            addSubscriber((token: string) => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              resolve(axiosAuthClient(originalRequest));
            });
          });
        }
        console.log(`will call for new accesstoken`);
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

          setAccessToken(newAccessToken);
  
          // Retry the failed request with the new access token
          axiosAuthClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;
          originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
  
          // Execute queued requests
          onRefreshed(newAccessToken);
          isRefreshing = false;
  
          return axiosAuthClient(originalRequest); // Retry original request with new token
        } catch (err) {
          return Promise.reject(err);
        }
      }
  
      return Promise.reject(error);
    }
  );
