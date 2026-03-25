import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from 'reactstrap';
import { SSOEnabled } from '../configuration';
import { getUseOidcAccessToken, NoSSOUserInfo } from '../SSODisabledDefaults';
import type { MediaDetails, MediaRequest } from '../types';
import {
  fetchActiveRequestsByGuid,
  submitMediaRequest,
  subscribeToRequest,
  unsubscribeFromRequest,
} from '../utils/api';
import {
  formatResolution,
  formatSubscriberList,
  parseVideoResolutionTier,
  REQUEST_RESOLUTION_TIERS,
} from '../utils/formatting';
import './RequestModal.css';

const RESOLUTION_SELECT_OPTIONS = REQUEST_RESOLUTION_TIERS.map((value) => ({
  value,
  label: value,
}));

type ApiFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;

type RequestModalItem = {
  guid?: string;
  ratingKey?: string;
  title: string;
  type?: string;
  itemType?: string;
  childCount?: number;
} | null;

type RequestModalProps = {
  isOpen: boolean;
  toggle: () => void;
  item: RequestModalItem;
  apiFetch: ApiFetch;
  onSuccess?: () => void;
  isUpgrade?: boolean;
};

type SubmitAlert = {
  type: 'success' | 'danger';
  message: string;
};

function moviePendingMatchesSelection(
  r: MediaRequest,
  selectedResolution: string
): boolean {
  if (r.itemType !== 'movie' || r.status.toLowerCase() !== 'pending') {
    return false;
  }
  if (selectedResolution === 'any') {
    return !r.requestedResolution || r.requestedResolution === 'any';
  }
  return formatResolution(r.requestedResolution ?? '') === selectedResolution;
}

const RequestModal = ({
  isOpen,
  toggle,
  item,
  apiFetch,
  onSuccess,
  isUpgrade = false,
}: RequestModalProps) => {
  const [resolution, setResolution] = useState<string>('any');
  const [submitting, setSubmitting] = useState(false);
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [allSeasonsExist, setAllSeasonsExist] = useState(false);
  const [submitAlert, setSubmitAlert] = useState<SubmitAlert | null>(null);
  const [existingMovieResolutions, setExistingMovieResolutions] = useState<
    string[]
  >([]);
  const [pendingRequests, setPendingRequests] = useState<MediaRequest[]>([]);
  const [loadingPendingRequests, setLoadingPendingRequests] = useState(false);

  const { accessTokenPayload } = getUseOidcAccessToken()();
  const userInfo = SSOEnabled
    ? (accessTokenPayload as { preferred_username?: string })
    : NoSSOUserInfo;
  const currentUsername = userInfo?.preferred_username ?? '';

  const guid = item && 'ratingKey' in item ? item.ratingKey : item?.guid;
  const itemType = item && 'type' in item ? item.type : item?.itemType;

  const refreshPendingRequests = useCallback(async () => {
    if (!guid) return;
    try {
      const list = await fetchActiveRequestsByGuid(apiFetch, guid);
      setPendingRequests(
        list.filter((r) => r.status.toLowerCase() === 'pending')
      );
    } catch {
      setPendingRequests([]);
    }
  }, [apiFetch, guid]);

  useEffect(() => {
    if (!isOpen || !guid) {
      setPendingRequests([]);
      return;
    }
    let cancelled = false;
    setLoadingPendingRequests(true);
    (async () => {
      try {
        const list = await fetchActiveRequestsByGuid(apiFetch, guid);
        if (!cancelled) {
          setPendingRequests(
            list.filter((r) => r.status.toLowerCase() === 'pending')
          );
        }
      } catch {
        if (!cancelled) setPendingRequests([]);
      } finally {
        if (!cancelled) setLoadingPendingRequests(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, guid, apiFetch]);

  useEffect(() => {
    let isMounted = true;
    if (!isOpen || itemType !== 'movie' || !guid) {
      setExistingMovieResolutions([]);
      return () => {
        isMounted = false;
      };
    }

    const fetchExistingResolutions = async () => {
      try {
        const mediaRes = await apiFetch(
          `/api/media/${encodeURIComponent(guid)}`
        );
        if (!isMounted) return;
        if (!mediaRes.ok) {
          setExistingMovieResolutions([]);
          return;
        }
        const mediaData = (await mediaRes.json()) as MediaDetails;
        const existing = new Set<string>();
        for (const server of mediaData.availableOn ?? []) {
          for (const v of server.versions ?? []) {
            const opt = parseVideoResolutionTier(v.videoResolution);
            if (opt) existing.add(opt);
          }
        }
        setExistingMovieResolutions([...existing]);
      } catch (err) {
        console.error('Failed to fetch existing movie resolutions:', err);
        if (isMounted) setExistingMovieResolutions([]);
      }
    };

    fetchExistingResolutions();
    return () => {
      isMounted = false;
    };
  }, [isOpen, itemType, guid, apiFetch]);

  const resolutionOptions = useMemo(() => {
    if (itemType !== 'movie') {
      return [...RESOLUTION_SELECT_OPTIONS];
    }
    return RESOLUTION_SELECT_OPTIONS.filter(
      (o) => !existingMovieResolutions.includes(o.value)
    );
  }, [itemType, existingMovieResolutions]);

  useEffect(() => {
    if (
      resolution !== 'any' &&
      itemType === 'movie' &&
      existingMovieResolutions.includes(resolution)
    ) {
      setResolution('any');
    }
  }, [resolution, itemType, existingMovieResolutions]);

  useEffect(() => {
    if (!submitAlert) return;
    const timeoutId = window.setTimeout(() => {
      setSubmitAlert(null);
    }, 4500);
    return () => window.clearTimeout(timeoutId);
  }, [submitAlert]);

  useEffect(() => {
    let isMounted = true;
    if (isOpen && itemType === 'show' && guid) {
      setIsLoadingSeasons(true);
      setAllSeasonsExist(false);

      const fetchSeasons = async () => {
        try {
          let existingSeasons: number[] = [];

          if (isUpgrade) {
            const mediaRes = await apiFetch(
              `/api/media/${encodeURIComponent(guid)}`
            );
            if (mediaRes.ok) {
              const mediaData = await mediaRes.json();
              if (mediaData.availableOn && mediaData.availableOn.length > 0) {
                const uniqueSeasons = new Set<number>();

                for (const serverInfo of mediaData.availableOn) {
                  const childrenRes = await apiFetch(
                    `/api/servers/${serverInfo.serverId}/items/${serverInfo.ratingKey}/children`
                  );
                  if (childrenRes.ok) {
                    const childrenData = await childrenRes.json();
                    type SeasonChild = { index?: number };
                    ((childrenData?.Metadata ?? []) as SeasonChild[]).forEach(
                      (child) => {
                        if (
                          typeof child.index === 'number' &&
                          child.index > 0
                        ) {
                          uniqueSeasons.add(child.index);
                        }
                      }
                    );
                  }
                }
                existingSeasons = Array.from(uniqueSeasons);
              }
            }
          }

          const discoverRes = await apiFetch(
            `/api/discover/${encodeURIComponent(guid)}`
          );
          if (discoverRes.ok) {
            const data = await discoverRes.json();
            const children =
              data?.MediaContainer?.Metadata?.[0]?.Children?.Metadata;

            if (Array.isArray(children)) {
              type SeasonChild = { index?: number };
              const allDiscoverSeasons = (children as SeasonChild[])
                .map((child) => child.index)
                .filter(
                  (index): index is number =>
                    typeof index === 'number' && index > 0
                )
                .sort((a, b) => a - b);

              const missingSeasons = allDiscoverSeasons.filter(
                (s) => !existingSeasons.includes(s)
              );

              if (isMounted) {
                setAvailableSeasons(missingSeasons);
                if (
                  allDiscoverSeasons.length > 0 &&
                  missingSeasons.length === 0
                ) {
                  setAllSeasonsExist(true);
                }
              }
            }
          }
        } catch (err) {
          console.error('Failed to fetch seasons:', err);
        } finally {
          if (isMounted) setIsLoadingSeasons(false);
        }
      };

      fetchSeasons();
    } else {
      setAvailableSeasons([]);
      setSelectedSeasons([]);
      setAllSeasonsExist(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isOpen, itemType, guid, isUpgrade, apiFetch]);

  const pendingMovieMatch = useMemo(() => {
    if (itemType !== 'movie') return undefined;
    return pendingRequests.find((r) =>
      moviePendingMatchesSelection(r, resolution)
    );
  }, [pendingRequests, itemType, resolution]);

  const getPendingSeasonRequest = (season: number) =>
    pendingRequests.find(
      (r) =>
        r.itemType === 'show' &&
        r.requestedSeason === season &&
        r.status.toLowerCase() === 'pending'
    );

  const isUserInSubscribers = (subscribers: string[]) =>
    currentUsername !== '' && subscribers.includes(currentUsername);

  const movieDuplicateBlocked = itemType === 'movie' && !!pendingMovieMatch;

  const seasonsEligibleForSubmit = selectedSeasons.filter(
    (s) => !getPendingSeasonRequest(s)
  );

  const isSubmitDisabled =
    submitting ||
    movieDuplicateBlocked ||
    (isUpgrade && resolution === 'any' && selectedSeasons.length === 0) ||
    (itemType === 'show' &&
      selectedSeasons.length > 0 &&
      seasonsEligibleForSubmit.length === 0);

  const handleSubscribeRow = async (requestId: number) => {
    try {
      await subscribeToRequest(apiFetch, requestId);
      await refreshPendingRequests();
      setSubmitAlert({
        type: 'success',
        message: 'You will be notified when this is available.',
      });
      onSuccess?.();
    } catch (err) {
      setSubmitAlert({
        type: 'danger',
        message:
          err instanceof Error ? err.message : 'Failed to subscribe to request',
      });
    }
  };

  const handleUnsubscribeRow = async (requestId: number) => {
    if (!window.confirm('Unsubscribe from this request?')) return;
    try {
      await unsubscribeFromRequest(apiFetch, requestId);
      await refreshPendingRequests();
      setSubmitAlert({ type: 'success', message: 'Unsubscribed.' });
      onSuccess?.();
    } catch (err) {
      setSubmitAlert({
        type: 'danger',
        message: err instanceof Error ? err.message : 'Failed to unsubscribe',
      });
    }
  };

  const handleMovieRowAction = () => {
    if (!pendingMovieMatch) return;
    if (isUserInSubscribers(pendingMovieMatch.subscribers ?? [])) {
      void handleUnsubscribeRow(pendingMovieMatch.id);
    } else {
      void handleSubscribeRow(pendingMovieMatch.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      isSubmitDisabled ||
      !item ||
      !guid ||
      !itemType ||
      movieDuplicateBlocked
    )
      return;

    setSubmitting(true);
    try {
      const requestedResolution = resolution === 'any' ? null : resolution;

      let reqSeasons: number[] | null = null;
      if (itemType === 'show' && selectedSeasons.length > 0) {
        const eligible = selectedSeasons.filter(
          (s) => !getPendingSeasonRequest(s)
        );
        reqSeasons = eligible.length > 0 ? eligible : null;
      }
      const thumb: string | null | undefined =
        item && 'thumbPath' in item
          ? (item as { thumbPath?: string }).thumbPath
          : (item as { thumb?: string })?.thumb;
      await submitMediaRequest(apiFetch, {
        guid,
        title: item.title,
        itemType,
        requestedResolution,
        requestedSeasons: reqSeasons,
        thumb,
        year: (item as { year?: number })?.year ?? undefined,
        duration: (item as { duration?: number })?.duration ?? undefined,
      });
      await refreshPendingRequests();
      setSubmitAlert({
        type: 'success',
        message: 'Request submitted successfully!',
      });
      handleClose();
      onSuccess?.();
    } catch (err) {
      setSubmitAlert({
        type: 'danger',
        message:
          err instanceof Error ? err.message : 'Failed to submit request',
      });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResolution('any');
    setSelectedSeasons([]);
    setAvailableSeasons([]);
    setIsLoadingSeasons(false);
    setAllSeasonsExist(false);
    setPendingRequests([]);
    toggle();
  };

  if (!item && !submitAlert) return null;

  return (
    <>
      {item && (
        <Modal isOpen={isOpen} toggle={handleClose}>
          <ModalHeader toggle={handleClose}>
            {isUpgrade ? 'Upgrade Request: ' : 'Request: '}
            {item.title}
            {itemType === 'show' &&
              'childCount' in item &&
              item.childCount != null && (
                <small className="d-block text-muted mt-1">
                  Total Seasons available: {item.childCount}
                </small>
              )}
          </ModalHeader>
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <>
                {loadingPendingRequests && (
                  <p className="small text-muted mb-2">Loading requests…</p>
                )}
                <div className="form-group">
                  <label htmlFor="resolution">Resolution</label>
                  <select
                    id="resolution"
                    className="form-control"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    <option value="any">Any</option>
                    {resolutionOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {itemType === 'movie' && pendingMovieMatch && (
                  <div className="alert alert-info py-2 px-3 mb-3">
                    <div className="small font-weight-bold mb-1">
                      This resolution is already requested.
                    </div>
                    <div className="small text-muted mb-2">
                      Requested by:{' '}
                      {formatSubscriberList(
                        pendingMovieMatch.subscribers ?? []
                      )}
                    </div>
                  </div>
                )}
                <p
                  className="mt-3 mb-0 text-muted"
                  style={{ fontStyle: 'italic', fontSize: '0.85rem' }}
                >
                  Note: Certain resolutions may not exist/be available to
                  download.
                </p>
                {itemType === 'show' && !allSeasonsExist && (
                  <div className="form-group mt-3">
                    <label>Requested Seasons (optional)</label>
                    {isLoadingSeasons ? (
                      <div
                        className="request-modal-seasons-loading"
                        role="status"
                        aria-label="Loading available seasons"
                      >
                        <span className="request-modal-seasons-loading__dot" />
                        <span className="request-modal-seasons-loading__dot" />
                        <span className="request-modal-seasons-loading__dot" />
                      </div>
                    ) : availableSeasons.length > 0 ? (
                      <div className="d-flex flex-column mt-1">
                        {availableSeasons.map((seasonNum) => {
                          const pending = getPendingSeasonRequest(seasonNum);
                          if (pending) {
                            return (
                              <div
                                key={seasonNum}
                                className="d-flex flex-wrap align-items-center justify-content-between gap-2 border rounded p-2 mb-2 bg-light"
                              >
                                <span className="font-weight-bold small">
                                  Season {seasonNum}
                                </span>
                                <span className="small text-muted flex-grow-1">
                                  Requested by:{' '}
                                  {formatSubscriberList(
                                    pending.subscribers ?? []
                                  )}
                                </span>
                                {isUserInSubscribers(
                                  pending.subscribers ?? []
                                ) ? (
                                  <Button
                                    color="danger"
                                    size="sm"
                                    outline
                                    type="button"
                                    onClick={() =>
                                      handleUnsubscribeRow(pending.id)
                                    }
                                  >
                                    Unsubscribe
                                  </Button>
                                ) : (
                                  <Button
                                    color="primary"
                                    size="sm"
                                    type="button"
                                    onClick={() =>
                                      handleSubscribeRow(pending.id)
                                    }
                                  >
                                    Notify Me
                                  </Button>
                                )}
                              </div>
                            );
                          }
                          return (
                            <div
                              key={seasonNum}
                              className="request-modal-season-cb custom-control custom-checkbox mr-3 mb-2"
                            >
                              <input
                                className="custom-control-input"
                                type="checkbox"
                                id={`season-${seasonNum}`}
                                checked={selectedSeasons.includes(seasonNum)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSeasons([
                                      ...selectedSeasons,
                                      seasonNum,
                                    ]);
                                  } else {
                                    setSelectedSeasons(
                                      selectedSeasons.filter(
                                        (s) => s !== seasonNum
                                      )
                                    );
                                  }
                                }}
                              />
                              <label
                                className="custom-control-label"
                                htmlFor={`season-${seasonNum}`}
                              >
                                Season {seasonNum}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-muted small">Loading...</div>
                    )}
                    {!isLoadingSeasons && availableSeasons.length > 0 && (
                      <small className="text-muted d-block mt-2">
                        Leave all unchecked to request all missing seasons.
                        Seasons already requested by other users can only be
                        subscribed to.
                      </small>
                    )}
                  </div>
                )}

                {itemType === 'show' && allSeasonsExist && (
                  <div className="mt-2">
                    All existing seasons are available on Plex.
                  </div>
                )}

                {isUpgrade &&
                  resolution === 'any' &&
                  selectedSeasons.length === 0 && (
                    <div className="text-danger small mt-2 fw-bold">
                      {itemType === 'show' && !allSeasonsExist
                        ? '* Select either a new resolution or missing seasons to upgrade.'
                        : '* Select a new resolution to upgrade.'}
                    </div>
                  )}
              </>
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" type="button" onClick={handleClose}>
                Cancel
              </Button>
              {movieDuplicateBlocked ? (
                <Button
                  color={
                    pendingMovieMatch &&
                    isUserInSubscribers(pendingMovieMatch.subscribers ?? [])
                      ? 'danger'
                      : 'primary'
                  }
                  type="button"
                  onClick={handleMovieRowAction}
                >
                  {pendingMovieMatch &&
                  isUserInSubscribers(pendingMovieMatch.subscribers ?? [])
                    ? 'Unsubscribe'
                    : 'Notify Me'}
                </Button>
              ) : (
                <Button
                  color="primary"
                  type="submit"
                  disabled={isSubmitDisabled}
                >
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              )}
            </ModalFooter>
          </form>
        </Modal>
      )}
      {submitAlert && (
        <div className="request-modal-submit-alert">
          <Alert
            color={submitAlert.type}
            fade={false}
            className="mb-0 alert-dismissible request-modal-submit-alert__alert"
            role="alert"
          >
            <button
              type="button"
              className="close request-modal-submit-alert__close"
              aria-label="Close"
              onClick={() => setSubmitAlert(null)}
            >
              <span aria-hidden="true">&times;</span>
            </button>
            {submitAlert.message}
          </Alert>
        </div>
      )}
    </>
  );
};

export default RequestModal;
