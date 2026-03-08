import { useMemo } from 'react';
import { components } from '../api-types';
import { apiPrefix, SSOEnabled } from '../configuration';
import { getUseOidcAccessToken } from '../SSODisabledDefaults';

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

export const createPlayQueue = async (
  apiFetch: ApiFetch,
  serverId: string,
  ratingKey: string
): Promise<components['schemas']['PlayQueueResponse']> => {
  const response = await apiFetch(
    `/api/servers/${serverId}/play/${ratingKey}`,
    {
      method: 'POST',
      headers: {
        'X-Plex-Client-Identifier': getClientIdentifier(),
      },
    }
  );
  if (!response.ok) throw new Error('Failed to create play queue');
  return await response.json();
};
