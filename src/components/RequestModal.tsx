import { useEffect, useState } from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { submitMediaRequest } from '../utils/api';
import './RequestModal.css';

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const guid = item && 'ratingKey' in item ? item.ratingKey : item?.guid;
  const itemType = item && 'type' in item ? item.type : item?.itemType;

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

  const isSubmitDisabled =
    submitting ||
    (isUpgrade && resolution === 'any' && selectedSeasons.length === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled || !item || !guid || !itemType) return;

    setError(null);
    setSubmitting(true);
    try {
      const requestedResolution = resolution === 'any' ? null : resolution;

      let requestedSeasons: number[] | null = null;
      if (itemType === 'show' && selectedSeasons.length > 0) {
        requestedSeasons = selectedSeasons;
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
        requestedSeasons,
        thumb,
        year: (item as { year?: number })?.year ?? undefined,
        duration: (item as { duration?: number })?.duration ?? undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        toggle();
        onSuccess?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setResolution('any');
    setSelectedSeasons([]);
    setError(null);
    setSuccess(false);
    toggle();
  };

  if (!item) return null;

  return (
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
          {success ? (
            <p className="text-success mb-0">Request submitted successfully!</p>
          ) : (
            <>
              {error && (
                <div className="alert alert-danger small" role="alert">
                  {error}
                </div>
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
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4K">4K</option>
                </select>
              </div>
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
                    <div className="text-muted small">
                      Loading available seasons...
                    </div>
                  ) : availableSeasons.length > 0 ? (
                    <div className="d-flex flex-wrap mt-1">
                      {availableSeasons.map((seasonNum) => (
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
                                  selectedSeasons.filter((s) => s !== seasonNum)
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
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted small">Loading...</div>
                  )}
                  <small className="text-muted d-block mt-2">
                    Leave all unchecked to request all missing seasons.
                  </small>
                </div>
              )}

              {itemType === 'show' && allSeasonsExist && (
                <div className="mt-2">
                  All available seasons are already on Plex.
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
          )}
        </ModalBody>
        {!success && (
          <ModalFooter>
            <Button color="secondary" type="button" onClick={handleClose}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={isSubmitDisabled}>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </Button>
          </ModalFooter>
        )}
      </form>
    </Modal>
  );
};

export default RequestModal;
