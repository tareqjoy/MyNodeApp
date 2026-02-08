'use client'
import { AuthRefreshRes } from '@tareqjoy/models';
import { plainToInstance } from 'class-transformer';

const authRefreshUrl: string =
  process.env.NEXT_PUBLIC_AUTH_REFRESH_URL || '/v1/auth/refresh/';

interface EnhancedRequestInit extends RequestInit {
  _retry?: boolean;
}

type FetchResponse<T = unknown> = {
  status: number;
  ok: boolean;
  data: T;
  headers: Headers;
};

const ACCESS_TOKEN_EVENT = 'auth:access-token';
const DEVICE_ID_KEY = 'deviceId';
const DEFAULT_TIMEOUT_MS = 5000;

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

class HttpError<T = unknown> extends Error {
  status: number;
  data: T | null;
  constructor(message: string, status: number, data: T | null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.data = data;
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(accessTokenValue: string) {
  accessToken = accessTokenValue;
}

export function deleteAccessToken() {
  accessToken = null;
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

export function getUserName(): string | null {
  return localStorage.getItem('username');
}

export function deleteUserId() {
  localStorage.removeItem('userId');
}

export function deleteUserName() {
  localStorage.removeItem('username');
}

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

function buildUrl(
  url: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): string {
  if (!params) return url;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    searchParams.append(key, String(value));
  });
  const qs = searchParams.toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

function mergeHeaders(base?: HeadersInit, extra?: HeadersInit): Headers {
  const headers = new Headers(base || undefined);
  if (extra) {
    const extraHeaders = new Headers(extra);
    extraHeaders.forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

async function fetchJson<T>(
  input: RequestInfo | URL,
  init: EnhancedRequestInit = {},
): Promise<FetchResponse<T>> {
  const timeoutMs = init._retry ? DEFAULT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), {
      once: true,
    });
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
    });

    let data: any = null;
    if (response.status !== 204 && response.status !== 205) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text.length ? text : null;
      }
    }

    const fetchResp: FetchResponse<T> = {
      status: response.status,
      ok: response.ok,
      data: data as T,
      headers: response.headers,
    };

    if (!response.ok) {
      throw new HttpError('Request failed', response.status, data);
    }

    return fetchResp;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchRaw(
  input: RequestInfo | URL,
  init: EnhancedRequestInit = {},
): Promise<Response> {
  const timeoutMs = init._retry ? DEFAULT_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), {
      once: true,
    });
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: 'include',
    });

    if (!response.ok) {
      let data: any = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text.length ? text : null;
      }
      throw new HttpError('Request failed', response.status, data);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshResp = await fetchJson<AuthRefreshRes>(authRefreshUrl, {
    method: 'POST',
    headers: { 'Device-ID': getOrCreateDeviceId() },
  });
  const authRefreshResObj = plainToInstance(AuthRefreshRes, refreshResp.data);
  const newAccessToken =
    authRefreshResObj.access_token ||
    (refreshResp.data &&
      ((refreshResp.data as any).access_token || (refreshResp.data as any).accessToken));
  if (!newAccessToken) {
    return null;
  }
  setAccessToken(newAccessToken);
  return newAccessToken;
}

async function forceRefreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken()
      .catch(() => {
        console.info('authFetch: error while refreshing access token');
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function ensureAccessToken(): Promise<string | null> {
  if (accessToken) {
    return accessToken;
  }
  return forceRefreshAccessToken();
}

async function authFetchJson<T>(
  url: string,
  init: EnhancedRequestInit = {},
): Promise<FetchResponse<T>> {
  const headers = mergeHeaders(init.headers, undefined);
  if (!headers.get('Authorization')) {
    const token = await ensureAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    return await fetchJson<T>(url, {
      ...init,
      headers,
    });
  } catch (err) {
    if (err instanceof HttpError && err.status === 401 && !init._retry) {
      if (url.includes(authRefreshUrl)) {
        throw err;
      }
      const newAccessToken = await forceRefreshAccessToken();
      if (!newAccessToken) {
        deleteAccessToken();
        throw err;
      }
      const retryHeaders = mergeHeaders(headers, {
        Authorization: `Bearer ${newAccessToken}`,
      });
      return fetchJson<T>(url, {
        ...init,
        _retry: true,
        headers: retryHeaders,
      });
    }
    throw err;
  }
}

async function authFetchRaw(
  url: string,
  init: EnhancedRequestInit = {},
): Promise<Response> {
  const headers = mergeHeaders(init.headers, undefined);
  if (!headers.get('Authorization')) {
    const token = await ensureAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  try {
    return await fetchRaw(url, {
      ...init,
      headers,
    });
  } catch (err) {
    if (err instanceof HttpError && err.status === 401 && !init._retry) {
      if (url.includes(authRefreshUrl)) {
        throw err;
      }
      const newAccessToken = await forceRefreshAccessToken();
      if (!newAccessToken) {
        deleteAccessToken();
        throw err;
      }
      const retryHeaders = mergeHeaders(headers, {
        Authorization: `Bearer ${newAccessToken}`,
      });
      return fetchRaw(url, {
        ...init,
        _retry: true,
        headers: retryHeaders,
      });
    }
    throw err;
  }
}

export async function authGet<T>(
  url: string,
  options?: {
    params?: Record<string, string | number | boolean | null | undefined>;
    headers?: HeadersInit;
  },
): Promise<FetchResponse<T>> {
  const fullUrl = buildUrl(url, options?.params);
  return authFetchJson<T>(fullUrl, {
    method: 'GET',
    headers: options?.headers,
  });
}

export async function authPost<T>(
  url: string,
  body?: unknown,
  options?: { headers?: HeadersInit },
): Promise<FetchResponse<T>> {
  const headers = mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return authFetchJson<T>(url, {
    method: 'POST',
    headers,
    body: payload,
  });
}

export async function publicGet<T>(
  url: string,
  options?: {
    params?: Record<string, string | number | boolean | null | undefined>;
    headers?: HeadersInit;
  },
): Promise<FetchResponse<T>> {
  const fullUrl = buildUrl(url, options?.params);
  return fetchJson<T>(fullUrl, {
    method: 'GET',
    headers: options?.headers,
  });
}

export async function publicPost<T>(
  url: string,
  body?: unknown,
  options?: { headers?: HeadersInit },
): Promise<FetchResponse<T>> {
  const headers = mergeHeaders({ 'Content-Type': 'application/json' }, options?.headers);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return fetchJson<T>(url, {
    method: 'POST',
    headers,
    body: payload,
  });
}

export async function authGetBlob(
  url: string,
  options?: {
    params?: Record<string, string | number | boolean | null | undefined>;
    headers?: HeadersInit;
  },
): Promise<Blob> {
  const fullUrl = buildUrl(url, options?.params);
  const response = await authFetchRaw(fullUrl, {
    method: 'GET',
    headers: options?.headers,
  });
  return response.blob();
}

export { HttpError };
export type { FetchResponse };
