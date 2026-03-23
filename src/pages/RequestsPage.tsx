import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Nav, NavItem, NavLink, Spinner } from 'reactstrap';
import { CheckIcon, NewIcon, UpgradeIcon } from '../components/icons';
import { SSOEnabled } from '../configuration';
import { getUseOidcAccessToken, NoSSOUserInfo } from '../SSODisabledDefaults';
import type { MediaRequest } from '../types';
import {
  clearNotifications,
  deleteMediaRequest,
  fetchMediaRequests,
  submitMediaRequest,
  useApiFetch,
} from '../utils/api';
import { formatDuration } from '../utils/formatting';
import './Home.css';

type TabType = 'pending' | 'fulfilled';

const MAX_USERNAME_LENGTH = 20;

function formatRequestedBy(username: string): string {
  if (username.length <= MAX_USERNAME_LENGTH) return username;
  const truncated = username.slice(0, MAX_USERNAME_LENGTH);
  const remaining = username.length - MAX_USERNAME_LENGTH;
  return `${truncated} +${remaining}`;
}

type RequestThumbnailProps = {
  src: string;
  alt: string;
};

function RequestThumbnail({ src, alt }: RequestThumbnailProps) {
  const apiFetch = useApiFetch();
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!src.startsWith('/api/')) {
      setResolvedSrc(src);
      return;
    }

    let objectUrl: string | null = null;

    const fetchImage = async () => {
      try {
        const response = await apiFetch(src);
        if (!response.ok) return;
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      } catch (error) {
        console.error('Failed to fetch request thumbnail', error);
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, apiFetch]);

  if (!resolvedSrc) return null;

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
      const data = await fetchMediaRequests(apiFetch);
      setRequests(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Failed to load media requests'
      );
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);
      try {
        await clearNotifications(apiFetch);
      } catch {
        console.error('Failed to clear notifications');
      }
      await loadRequests();
    };
    init();
  }, [apiFetch, loadRequests]);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'pending') {
      return requests.filter((r) => r.status.toLowerCase() === 'pending');
    }
    return requests.filter((r) => r.status.toLowerCase() !== 'pending');
  }, [requests, activeTab]);

  const userHasPendingForGuid = (guid: string) =>
    requests.some(
      (r) =>
        r.guid === guid &&
        r.username === currentUsername &&
        r.status.toLowerCase() === 'pending'
    );

  const handleNotifyMe = async (req: MediaRequest) => {
    try {
      await submitMediaRequest(apiFetch, {
        guid: req.guid,
        title: req.title,
        itemType: req.itemType,
        requestedSeasons: req.requestedSeasons ?? undefined,
        requestedResolution: req.requestedResolution ?? undefined,
        thumb: req.thumb ?? undefined,
        year: req.year ?? undefined,
        duration: req.duration ?? undefined,
      });
      await loadRequests();
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : 'Failed to subscribe to request'
      );
    }
  };

  const handleCancel = async (id: number) => {
    try {
      await deleteMediaRequest(apiFetch, id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to delete request');
    }
  };

  return (
    <div className="container mt-4">
      {error && (
        <Alert color="danger" toggle={() => setError(null)}>
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
            Pending (
            {
              requests.filter((r) => r.status.toLowerCase() === 'pending')
                .length
            }
            )
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
            Fulfilled (
            {
              requests.filter((r) => r.status.toLowerCase() !== 'pending')
                .length
            }
            )
          </NavLink>
        </NavItem>
      </Nav>

      {loading ? (
        <div className="d-flex justify-content-center py-5">
          <Spinner color="primary" />
        </div>
      ) : (
        <div className="results-grid">
          {filteredRequests.map((request) => {
            const plexThumbUrl = request.thumb?.startsWith('/')
              ? `https://metadata.provider.plex.tv${request.thumb}`
              : (request.thumb ?? undefined);
            const thumbUrl = plexThumbUrl
              ? `/api/image/global?url=${encodeURIComponent(plexThumbUrl)}`
              : undefined;
            const isOwnRequest = request.username === currentUsername;
            const alreadySubscribed = userHasPendingForGuid(request.guid);
            const isFulfilled = request.status.toLowerCase() === 'fulfilled';
            const mediaPath = `/media/${request.guid.replace('plex://', '')}`;

            const cardContent = (
              <div className="position-relative">
                {request.thumb ? (
                  thumbUrl ? (
                    <RequestThumbnail src={thumbUrl} alt={request.title} />
                  ) : (
                    <div
                      className="card-img-top bg-secondary d-flex align-items-center justify-content-center text-white"
                      style={{ aspectRatio: '2/3', minHeight: 140 }}
                    >
                      {request.itemType === 'movie' ? 'Movie' : 'Show'}
                    </div>
                  )
                ) : (
                  <div
                    className="card-img-top bg-secondary d-flex align-items-center justify-content-center text-white"
                    style={{ aspectRatio: '2/3', minHeight: 140 }}
                  >
                    {request.itemType === 'movie' ? 'Movie' : 'Show'}
                  </div>
                )}
                <span
                  className="request-status-icon"
                  title={
                    isFulfilled
                      ? 'Fulfilled'
                      : request.isUpgrade
                        ? 'Upgrade request'
                        : 'New request'
                  }
                >
                  {isFulfilled ? (
                    <CheckIcon className="request-status-icon--fulfilled" />
                  ) : request.isUpgrade ? (
                    <UpgradeIcon className="request-status-icon--upgrade" />
                  ) : (
                    <NewIcon className="request-status-icon--new" />
                  )}
                </span>
                <div className="card-body p-2 d-flex flex-column">
                  <h3 className="card-title h6 mb-1 text-dark">
                    {request.title}
                  </h3>
                  {isFulfilled && (
                    <small className="d-block text-muted mb-1">
                      Available on:{' '}
                      {request.serverNames?.join(', ') || 'Unknown Server'}
                    </small>
                  )}
                  <p
                    className="card-year text-muted small mb-1 d-flex align-items-center flex-wrap"
                    style={{ gap: '0.5rem' }}
                  >
                    {request.year != null && <span>{request.year}</span>}
                    {(request as { contentRating?: string }).contentRating && (
                      <span>
                        {(request as { contentRating?: string }).contentRating}
                      </span>
                    )}
                    {request.duration != null && (
                      <span>{formatDuration(request.duration)}</span>
                    )}
                    {request.itemType === 'show' &&
                      (request as { childCount?: number }).childCount !=
                        null && (
                        <span>
                          {(request as { childCount?: number }).childCount}{' '}
                          Season
                          {(request as { childCount?: number }).childCount === 1
                            ? ''
                            : 's'}
                        </span>
                      )}
                  </p>
                  <small className="text-muted d-block mb-1">
                    Requested by: {formatRequestedBy(request.username)}
                  </small>
                  {request.requestedResolution && (
                    <small className="d-block mb-1">
                      Resolution: {request.requestedResolution}
                    </small>
                  )}
                  {request.requestedSeasons &&
                    request.requestedSeasons.length > 0 && (
                      <small className="d-block mb-2">
                        Seasons: {request.requestedSeasons.join(', ')}
                      </small>
                    )}
                  {activeTab === 'pending' && (
                    <div className="mt-auto">
                      {isOwnRequest ? (
                        <Button
                          color="danger"
                          outline
                          size="sm"
                          className="w-100"
                          onClick={() => handleCancel(request.id)}
                        >
                          Cancel Request
                        </Button>
                      ) : (
                        <Button
                          color="primary"
                          outline
                          size="sm"
                          className="w-100"
                          disabled={alreadySubscribed}
                          onClick={() => handleNotifyMe(request)}
                        >
                          🔔 Notify Me
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );

            return isFulfilled ? (
              <Link
                key={request.id}
                to={mediaPath}
                className="result-link text-decoration-none"
              >
                <div className="card result-card h-100">{cardContent}</div>
              </Link>
            ) : (
              <div key={request.id} className="card result-card h-100">
                {cardContent}
              </div>
            );
          })}
        </div>
      )}

      {!loading && filteredRequests.length === 0 && (
        <p className="text-muted">No {activeTab} requests.</p>
      )}
    </div>
  );
};

export default RequestsPage;
