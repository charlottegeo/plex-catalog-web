import { useMemo } from 'react';
import { components } from '../api-types';
import { apiPrefix, SSOEnabled } from '../configuration';
import { getUseOidcAccessToken } from '../SSODisabledDefaults';
import type {
  DiscoverResult,
  MediaRequest,
  MediaRequestPayload,
} from '../types';

type ApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

export function parseItemsArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw;
  if (
    raw &&
    typeof raw === 'object' &&
    'items' in raw &&
    Array.isArray((raw as { items: unknown }).items)
  ) {
    return (raw as { items: T[] }).items;
  }
  return [];
}

export function useApiFetch(): ApiFetch {
  const useOidcAccessTokenHook = getUseOidcAccessToken();
  const { accessToken } = useOidcAccessTokenHook();

  return useMemo<ApiFetch>(() => {
    return async (input, init) => {
      const isApiRequest =
        typeof input === 'string'
          ? input.startsWith('/api')
          : input instanceof URL
            ? input.pathname.startsWith('/api')
            : 'url' in (input as Request) &&
              (input as Request).url.includes('/api');

      if (!isApiRequest) {
        return fetch(input as RequestInfo | URL, init);
      }

      const headers = new Headers(init?.headers || {});

      if (SSOEnabled && accessToken && accessToken.trim() !== '') {
        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${accessToken}`);
        }
      }

      const nextInit: RequestInit = { ...init, headers };
      const url =
        typeof input === 'string' && input.startsWith('/')
          ? `${apiPrefix ?? ''}${input}`
          : input;

      return fetch(url, nextInit);
    };
  }, [accessToken]);
}

export const getClientIdentifier = (): string => {
  let id = localStorage.getItem('plex_client_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('plex_client_id', id);
  }
  return id;
};

export const fetchExtras = async (
  apiFetch: ApiFetch,
  serverId: string,
  ratingKey: string
): Promise<components['schemas']['PlexExtra'][]> => {
  const response = await apiFetch(
    `/api/servers/${serverId}/items/${ratingKey}/extras`
  );
  if (!response.ok) return [];
  return await response.json();
};

export const searchDiscover = async (
  apiFetch: ApiFetch,
  query: string,
  limit?: number,
  offset?: number
): Promise<DiscoverResult[]> => {
  const params = new URLSearchParams({ q: query });
  if (typeof limit === 'number') params.set('limit', String(limit));
  if (typeof offset === 'number') params.set('offset', String(offset));
  const response = await apiFetch(`/api/discover?${params.toString()}`);
  if (!response.ok) return [];
  const data = await response.json();
  const paginated = parseItemsArray<DiscoverResult>(data);
  if (paginated.length > 0) return paginated;
  return (
    (data as { MediaContainer?: { Metadata?: DiscoverResult[] } })
      ?.MediaContainer?.Metadata ?? []
  );
};

export const submitMediaRequest = async (
  apiFetch: ApiFetch,
  payload: MediaRequestPayload
) => {
  const response = await apiFetch('/api/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('Failed to submit request');
  return response.json();
};

export type FetchMediaRequestsParams = {
  status?: 'pending' | 'fulfilled';
  sortBy?: 'createdAt' | 'fulfilledAt';
  sortOrder?: 'asc' | 'desc';
};

export const fetchMediaRequests = async (
  apiFetch: ApiFetch,
  params?: FetchMediaRequestsParams
): Promise<MediaRequest[]> => {
  const search = new URLSearchParams();
  if (params?.status) search.set('status', params.status);
  if (params?.sortBy) search.set('sortBy', params.sortBy);
  if (params?.sortOrder) search.set('sortOrder', params.sortOrder);
  const qs = search.toString();
  const response = await apiFetch(`/api/requests${qs ? `?${qs}` : ''}`);
  if (!response.ok) throw new Error('Failed to fetch requests');
  return parseItemsArray<MediaRequest>(await response.json());
};

export const deleteMediaRequest = async (
  apiFetch: ApiFetch,
  id: number
): Promise<string> => {
  const response = await apiFetch(`/api/requests/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete request');
  return response.text();
};

export const fetchActiveRequestsByGuid = async (
  apiFetch: ApiFetch,
  guid: string
): Promise<MediaRequest[]> => {
  const response = await apiFetch(
    `/api/requests/media/${encodeURIComponent(guid)}`
  );
  if (!response.ok) return [];
  return parseItemsArray<MediaRequest>(await response.json());
};

export const subscribeToRequest = async (
  apiFetch: ApiFetch,
  id: number
): Promise<void> => {
  const response = await apiFetch(`/api/requests/${id}/subscribe`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to subscribe');
};

export const unsubscribeFromRequest = async (
  apiFetch: ApiFetch,
  id: number
): Promise<void> => {
  const response = await apiFetch(`/api/requests/${id}/subscribe`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to unsubscribe');
};
