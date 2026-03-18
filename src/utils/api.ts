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
  query: string
): Promise<DiscoverResult[]> => {
  const response = await apiFetch(
    `/api/discover?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) return [];
  const data = await response.json();
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

export const fetchMediaRequests = async (
  apiFetch: ApiFetch
): Promise<MediaRequest[]> => {
  const response = await apiFetch('/api/requests');
  if (!response.ok) throw new Error('Failed to fetch requests');
  return response.json();
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

export const fetchNotificationCount = async (
  apiFetch: ApiFetch
): Promise<number> => {
  const response = await apiFetch('/api/requests/notifications/count');
  if (!response.ok) return 0;
  const data = await response.json();
  return (data as { count?: number }).count ?? 0;
};

export const clearNotifications = async (apiFetch: ApiFetch): Promise<void> => {
  await apiFetch('/api/requests/notifications/clear', {
    method: 'POST',
  });
};
