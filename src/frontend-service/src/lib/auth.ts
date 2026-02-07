'use client'
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthRefreshReq, AuthRefreshRes } from '@tareqjoy/models'
import { plainToInstance } from 'class-transformer';

const authRefreshUrl: string = process.env.NEXT_PUBLIC_AUTH_REFRESH_URL || "/v1/auth/refresh/";

interface EnhancedAxiosRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean; 
}

let refreshPromise: Promise<string> | null = null;

export function getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
}

export function setAccessToken(accessToken: string) {
  localStorage.setItem('accessToken', accessToken);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth:access-token'));
  }
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

        originalRequest._retry = true;

        if (!refreshPromise) {
          console.debug("axiosAuthClient: no refresh in flight, starting refresh");
          refreshPromise = (async () => {
            const refreshReq = new AuthRefreshReq(refreshToken);
            const refreshResp = await axiosPublicClient.post(
              authRefreshUrl,
              refreshReq,
              { headers: { 'Device-ID': 'some-unique-device-id' } }
            );
            const authRefreshResObj = plainToInstance(AuthRefreshRes, refreshResp.data);
            const newAccessToken = authRefreshResObj.access_token;

            console.debug(`axiosAuthClient: yay! found new accesstoken & saving into local db: ${newAccessToken}`);
            setAccessToken(newAccessToken);
            axiosAuthClient.defaults.headers.common['Authorization'] = 'Bearer ' + newAccessToken;

            return newAccessToken;
          })()
            .catch((err) => {
              console.error("axiosAuthClient: error while getting new accesstoken");
              throw err;
            })
            .finally(() => {
              refreshPromise = null;
            });
        } else {
          console.debug("axiosAuthClient: refresh already in flight, awaiting token");
        }

        try {
          const newAccessToken = await refreshPromise;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
          return axiosAuthClient(originalRequest);
        } catch (err) {
          return Promise.reject(err);
        }
      }
      console.debug("axiosAuthClient: not 401, not doing any accesstoken related work");
      return Promise.reject(error);
    }
  );
