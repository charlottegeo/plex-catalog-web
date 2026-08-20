import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Nav, NavItem, NavLink, Spinner } from 'reactstrap';
import {
  BrokenImageIcon,
  CheckIcon,
  NewIcon,
  UpgradeIcon,
} from '../components/icons';
import { SSOEnabled } from '../configuration';
import { getUseOidcAccessToken, NoSSOUserInfo } from '../SSODisabledDefaults';
import type { MediaRequest } from '../types';
import {
  fetchMediaRequests,
  subscribeToRequest,
  unsubscribeFromRequest,
  useApiFetch,
} from '../utils/api';
import {
  formatDate,
  formatDuration,
  formatResolution,
  formatSubscriberList,
} from '../utils/formatting';
import './Home.css';

type TabType = 'pending' | 'fulfilled';

type GroupedMedia = {
  guid: string;
  requests: MediaRequest[];
};

function sortRequestsInGroup(items: MediaRequest[]): MediaRequest[] {
  return [...items].sort((a, b) => {
    if (a.itemType === 'movie' && b.itemType === 'movie') {
      const ra = (a.requestedResolution ?? '').toLowerCase();
      const rb = (b.requestedResolution ?? '').toLowerCase();
      return ra.localeCompare(rb);
    }
    if (a.itemType === 'show' && b.itemType === 'show') {
      return (a.requestedSeason ?? 0) - (b.requestedSeason ?? 0);
    }
    return a.itemType.localeCompare(b.itemType);
  });
}

function groupRequestsByGuid(requests: MediaRequest[]): GroupedMedia[] {
  const map = new Map<string, MediaRequest[]>();
  const order: string[] = [];
  for (const r of requests) {
    if (!map.has(r.guid)) {
      order.push(r.guid);
      map.set(r.guid, []);
    }
    map.get(r.guid)!.push(r);
  }
  return order.map((guid) => ({
    guid,
    requests: sortRequestsInGroup(map.get(guid)!),
  }));
}

function rowLabel(req: MediaRequest): string {
  if (req.itemType === 'movie') {
    const res = req.requestedResolution?.trim();
    if (!res) return 'Any resolution';
    return formatResolution(res);
  }
  if (req.requestedSeason != null && req.requestedSeason > 0) {
    return `Season ${req.requestedSeason}`;
  }
  return 'Show';
}

function latestFulfilledAt(requests: MediaRequest[]): string | null {
  let latest: string | null = null;
  for (const r of requests) {
    if (!r.fulfilledAt) continue;
    if (!latest || new Date(r.fulfilledAt) > new Date(latest)) {
      latest = r.fulfilledAt;
    }
  }
  return latest;
}

type RequestThumbnailProps = {
  src: string;
  alt: string;
};

function RequestThumbnail({ src, alt }: RequestThumbnailProps) {
  const apiFetch = useApiFetch();
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    if (!src.startsWith('/api/')) {
      setResolvedSrc(src);
      return;
    }

    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        const response = await apiFetch(src);
        if (!response.ok) {
          setError(true);
          return;
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      } catch (err) {
        console.error('Failed to fetch request thumbnail', err);
        setError(true);
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, apiFetch]);

  if (error) {
    return (
      <div
        className="card-img-top request-poster-error"
        role="img"
        aria-label={`Poster for ${alt} could not be loaded`}
        title="Poster could not be loaded"
      >
        <BrokenImageIcon className="request-poster-error__icon" />
      </div>
    );
  }

  if (!resolvedSrc) {
    return (
      <div className="card-img-top request-poster-placeholder" aria-hidden />
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className="card-img-top"
      style={{
        aspectRatio: '2/3',
        objectFit: 'cover',
        width: '100%',
      }}
      onError={() => setError(true)}
    />
  );
}

const RequestsPage = () => {
  const [requests, setRequests] = useState<MediaRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const apiFetch = useApiFetch();

  const { accessTokenPayload } = getUseOidcAccessToken()();
  const userInfo = SSOEnabled
    ? (accessTokenPayload as { preferred_username?: string })
    : NoSSOUserInfo;
  const currentUsername = userInfo?.preferred_username ?? '';

  const loadRequests = useCallback(async () => {
    try {
      const data = await fetchMediaRequests(apiFetch, {
        status: activeTab,
        sortBy: activeTab === 'pending' ? 'createdAt' : 'fulfilledAt',
        sortOrder: 'desc',
      });
      setRequests(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load media requests'
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch, activeTab]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      await loadRequests();
    };
    init();
  }, [loadRequests]);

  const groupedMedia = useMemo(() => groupRequestsByGuid(requests), [requests]);

  const handleSubscribe = async (requestId: number) => {
    try {
      await subscribeToRequest(apiFetch, requestId);
      await loadRequests();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'Failed to subscribe to request'
      );
    }
  };

  const handleUnsubscribe = async (requestId: number) => {
    const shouldUnsub = window.confirm(
      'Are you sure you want to unsubscribe from this request?'
    );
    if (!shouldUnsub) return;

    try {
      await unsubscribeFromRequest(apiFetch, requestId);
      await loadRequests();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'Failed to unsubscribe from request'
      );
    }
  };

  const isUserSubscribed = (subscribers: string[]) =>
    currentUsername !== '' && subscribers.includes(currentUsername);

  return (
    <div className="container mt-4">
      {error && (
        <Alert color="danger" fade={false} toggle={() => setError(null)}>
          {error}
        </Alert>
      )}

      <h2 className="mb-4">Media Requests</h2>

      <Nav pills className="mb-4">
        <NavItem>
          <NavLink
            className={activeTab === 'pending' ? 'active' : ''}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('pending');
            }}
          >
            Pending
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={activeTab === 'fulfilled' ? 'active' : ''}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('fulfilled');
            }}
          >
            Fulfilled
          </NavLink>
        </NavItem>
      </Nav>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner color="primary" />
        </div>
      ) : (
        <div className="results-grid results-grid--variable-height">
          {groupedMedia.map((group) => {
            const first = group.requests[0];
            const plexThumbUrl = first.thumb?.startsWith('/')
              ? `https://metadata.provider.plex.tv${first.thumb}`
              : (first.thumb ?? undefined);
            const thumbUrl = plexThumbUrl;
            const isFulfilled = first.status.toLowerCase() === 'fulfilled';
            const mediaPath = `/media/${first.guid.replace('plex://', '')}`;
            const anyUpgrade = group.requests.some((r) => r.isUpgrade);

            const cardContent = (
              <div className="position-relative d-flex flex-column">
                {first.thumb ? (
                  thumbUrl ? (
                    <RequestThumbnail src={thumbUrl} alt={first.title} />
                  ) : (
                    <div
                      className="card-img-top bg-secondary d-flex align-items-center justify-content-center text-white"
                      style={{ aspectRatio: '2/3', minHeight: 140 }}
                    >
                      {first.itemType === 'movie' ? 'Movie' : 'Show'}
                    </div>
                  )
                ) : (
                  <div
                    className="card-img-top bg-secondary d-flex align-items-center justify-content-center text-white"
                    style={{ aspectRatio: '2/3', minHeight: 140 }}
                  >
                    {first.itemType === 'movie' ? 'Movie' : 'Show'}
                  </div>
                )}
                <span
                  className={`request-status-icon request-status-icon--${
                    isFulfilled ? 'fulfilled' : anyUpgrade ? 'upgrade' : 'new'
                  }`}
                  title={
                    isFulfilled
                      ? 'Fulfilled'
                      : anyUpgrade
                        ? 'Upgrade request'
                        : 'New request'
                  }
                >
                  {isFulfilled ? (
                    <CheckIcon />
                  ) : anyUpgrade ? (
                    <UpgradeIcon />
                  ) : (
                    <NewIcon />
                  )}
                </span>
                <div className="card-body p-2 d-flex flex-column">
                  <h3 className="card-title h6 mb-1 text-dark">
                    {first.title}
                  </h3>
                  {isFulfilled && (
                    <>
                      <small className="d-block text-muted mb-1">
                        Fulfilled:{' '}
                        {formatDate(latestFulfilledAt(group.requests) ?? '') ||
                          '—'}
                      </small>
                      <small className="d-block text-muted mb-2">
                        Available on:{' '}
                        {[
                          ...new Set(
                            group.requests.flatMap((r) => r.serverNames ?? [])
                          ),
                        ].join(', ') || 'Unknown Server'}
                      </small>
                    </>
                  )}
                  <p
                    className="card-year text-muted small mb-2 d-flex align-items-center flex-wrap"
                    style={{ gap: '0.5rem' }}
                  >
                    {first.year != null && <span>{first.year}</span>}
                    {(first as { contentRating?: string }).contentRating && (
                      <span>
                        {(first as { contentRating?: string }).contentRating}
                      </span>
                    )}
                    {first.duration != null && (
                      <span>{formatDuration(first.duration)}</span>
                    )}
                    {first.itemType === 'show' &&
                      (first as { childCount?: number }).childCount != null && (
                        <span>
                          {(first as { childCount?: number }).childCount} Season
                          {(first as { childCount?: number }).childCount === 1
                            ? ''
                            : 's'}
                        </span>
                      )}
                  </p>

                  <div className="request-group-rows">
                    {group.requests.map((req) => (
                      <div
                        key={req.id}
                        className="request-group-row border rounded p-2 mb-2 bg-light"
                      >
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="badge badge-info">
                              {rowLabel(req)}
                            </span>
                            <span className="small text-muted">
                              Requested by:{' '}
                              <span className="text-dark">
                                {formatSubscriberList(req.subscribers ?? [])}
                              </span>
                            </span>
                          </div>
                          {activeTab === 'pending' && (
                            <div className="flex-shrink-0">
                              {isUserSubscribed(req.subscribers ?? []) ? (
                                <Button
                                  color="danger"
                                  size="sm"
                                  outline
                                  onClick={() => handleUnsubscribe(req.id)}
                                >
                                  Unsubscribe
                                </Button>
                              ) : (
                                <Button
                                  color="primary"
                                  size="sm"
                                  onClick={() => handleSubscribe(req.id)}
                                >
                                  Notify Me
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );

            return isFulfilled ? (
              <Link
                key={group.guid}
                to={mediaPath}
                className="result-link text-decoration-none"
              >
                <div className="card result-card">{cardContent}</div>
              </Link>
            ) : (
              <div key={group.guid} className="card result-card">
                {cardContent}
              </div>
            );
          })}
        </div>
      )}

      {!loading && groupedMedia.length === 0 && (
        <p className="text-muted">No {activeTab} requests.</p>
      )}
    </div>
  );
};

export default RequestsPage;
