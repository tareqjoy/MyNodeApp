'use client'
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AuthRefreshRes } from '@tareqjoy/models'
import { plainToInstance } from 'class-transformer';

const authRefreshUrl: string = process.env.NEXT_PUBLIC_AUTH_REFRESH_URL || "/v1/auth/refresh/";

interface EnhancedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const ACCESS_TOKEN_EVENT = 'auth:access-token';
const DEVICE_ID_KEY = 'deviceId';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(accessTokenValue: string) {
  accessToken = accessTokenValue;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACCESS_TOKEN_EVENT));
  }
}

export function deleteAccessToken() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ACCESS_TOKEN_EVENT));
  }
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
  withCredentials: true,
});

export const axiosPublicClient = axios.create({
  timeout: 5000,
  withCredentials: true,
});

export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device';
  }
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function deleteDeviceId() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshResp = await axiosPublicClient.post(
    authRefreshUrl,
    {},
    { headers: { 'Device-ID': getOrCreateDeviceId() } },
  );
  const authRefreshResObj = plainToInstance(AuthRefreshRes, refreshResp.data);
  const newAccessToken = authRefreshResObj.access_token;
  if (!newAccessToken) {
    return null;
  }
  setAccessToken(newAccessToken);
  axiosAuthClient.defaults.headers.common['Authorization'] =
    'Bearer ' + newAccessToken;
  return newAccessToken;
}

async function ensureAccessToken(): Promise<string | null> {
  if (accessToken) {
    return accessToken;
  }
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .catch((err) => {
        console.info('axiosAuthClient: error while refreshing access token');
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

axiosAuthClient.interceptors.request.use(
  async (config: EnhancedAxiosRequestConfig) => {
    if (!config.headers) {
      config.headers = {};
    }
    if (!config.headers['Authorization']) {
      const token = await ensureAccessToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

axiosAuthClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as EnhancedAxiosRequestConfig;
    console.debug('axiosAuthClient: intercepting after error response..');
    if (error.response?.status === 401 && !originalRequest?._retry) {
      console.debug(
        'axiosAuthClient: got 401, will try to refresh access token',
      );

      originalRequest._retry = true;

      try {
        const newAccessToken = await ensureAccessToken();
        if (!newAccessToken) {
          deleteAccessToken();
          return Promise.reject(error);
        }
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
        return axiosAuthClient(originalRequest);
      } catch (err) {
        deleteAccessToken();
        return Promise.reject(err);
      }
    }
    console.debug(
      'axiosAuthClient: not 401, not doing any access token related work',
    );
    return Promise.reject(error);
  },
);
