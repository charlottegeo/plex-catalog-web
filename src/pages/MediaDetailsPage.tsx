import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { PlexIcon, SubtitlesIcon } from '../components/icons';
import TVShowSeasons from '../components/TVShowSeasons';
import { useApiFetch } from '../utils/api';
import { formatDuration, formatResolution } from '../utils/formatting';
import './MediaDetailsPage.css';

const MediaDetailsSkeleton = () => (
  <div className="container mt-4">
    <div className="details-content">
      <div className="row mb-5">
        <div className="col-md-4 col-lg-3 mb-4 mb-md-0">
          <div
            className="skeleton skeleton-poster"
            style={{ aspectRatio: '2/3' }}
          ></div>
        </div>
        <div className="col-md-8 col-lg-9">
          <div
            className="skeleton skeleton-text"
            style={{ height: '2.5rem', width: '80%', marginBottom: '1rem' }}
          ></div>
          <div
            className="skeleton skeleton-text"
            style={{ height: '1rem', width: '20%', marginBottom: '1.5rem' }}
          ></div>
          <div
            className="skeleton skeleton-text"
            style={{ width: '100%' }}
          ></div>
          <div
            className="skeleton skeleton-text"
            style={{ width: '95%' }}
          ></div>
        </div>
      </div>
    </div>
  </div>
);

type MediaVersion = { videoResolution: string; subtitles: string[] };
type ServerAvailability = {
  serverId: string;
  serverName: string;
  ratingKey: string;
  versions: MediaVersion[];
};
type MediaDetails = {
  guid: string;
  title: string;
  summary?: string;
  year?: number;
  artPath?: string;
  thumbPath?: string;
  itemType: string;
  contentRating?: string;
  duration?: number;
  originallyAvailableAt?: string;
  studio?: string;
  availableOn: ServerAvailability[];
};

const MediaDetailsPage = () => {
  const params = useParams();
  const guid = params['*'];
  const location = useLocation();
  const navigate = useNavigate();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artImageUrl, setArtImageUrl] = useState<string | null>(null);
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isSummaryTruncated, setIsSummaryTruncated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlexUrl, setPendingPlexUrl] = useState<string | null>(null);
  const [pendingServerName, setPendingServerName] = useState<string | null>(
    null
  );
  const [seasonCounts, setSeasonCounts] = useState<Record<string, number>>({});
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const apiFetch = useApiFetch();

  const getPlexUrl = (serverId: string, ratingKey: string) =>
    `https://app.plex.tv/web/#!/server/${serverId}/details?key=%2Flibrary%2Fmetadata%2F${ratingKey}`;

  const handlePlexButtonClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    serverId: string,
    ratingKey: string,
    serverName: string
  ) => {
    e.preventDefault();
    const url = getPlexUrl(serverId, ratingKey);
    setPendingPlexUrl(url);
    setPendingServerName(serverName);
    setModalOpen(true);
  };

  const confirmPlexOpen = () => {
    if (pendingPlexUrl) {
      window.open(pendingPlexUrl, '_blank', 'noopener,noreferrer');
      setModalOpen(false);
      setPendingPlexUrl(null);
      setPendingServerName(null);
    }
  };

  useEffect(() => {
    if (!guid) return;
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/api/media/${encodeURIComponent(guid)}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setDetails(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [guid, apiFetch]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchArtImage = async () => {
      if (details?.artPath && details.availableOn.length > 0) {
        try {
          const serverId = details.availableOn[0].serverId;
          const imagePath = details.artPath.startsWith('/')
            ? details.artPath.substring(1)
            : details.artPath;
          const response = await apiFetch(
            `/api/servers/${serverId}/image/${imagePath}?width=1920&height=1080`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setArtImageUrl(objectUrl);
          }
        } catch (error) {
          console.error('Failed to fetch art image', error);
        }
      }
    };
    fetchArtImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [details, apiFetch]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchPosterImage = async () => {
      if (details?.thumbPath && details.availableOn.length > 0) {
        try {
          const serverId = details.availableOn[0].serverId;
          const imagePath = details.thumbPath.startsWith('/')
            ? details.thumbPath.substring(1)
            : details.thumbPath;
          const response = await apiFetch(
            `/api/servers/${serverId}/image/${imagePath}?width=400&height=600`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setPosterImageUrl(objectUrl);
          }
        } catch (error) {
          console.error('Failed to fetch poster image', error);
        }
      }
    };
    fetchPosterImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [details, apiFetch]);

  useEffect(() => {
    const checkTruncation = () => {
      if (summaryRef.current && details?.summary) {
        const element = summaryRef.current;
        setIsSummaryTruncated(
          element.scrollHeight > element.clientHeight ||
            element.scrollWidth > element.clientWidth
        );
      } else {
        setIsSummaryTruncated(false);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [details?.summary, isSummaryExpanded]);

  useEffect(() => {
    if (details?.itemType !== 'show') return;

    const fetchSeasonCounts = async () => {
      const counts: Record<string, number> = {};
      await Promise.all(
        details.availableOn.map(async (server) => {
          try {
            const response = await apiFetch(
              `/api/servers/${server.serverId}/shows/${server.ratingKey}/seasons`
            );
            if (response.ok) {
              const seasons = await response.json();
              counts[server.serverId] = seasons.length;
            }
          } catch (error) {
            console.error(
              `Failed to fetch seasons for server ${server.serverId}`,
              error
            );
          }
        })
      );
      setSeasonCounts(counts);
    };

    fetchSeasonCounts();
  }, [details?.itemType, details?.availableOn, apiFetch]);

  if (loading) return <MediaDetailsSkeleton />;
  if (error) return <p className="text-danger">{error}</p>;
  if (!details) return <p>Media not found.</p>;

  return (
    <>
      <div className="container mt-4">
        {artImageUrl && (
          <div
            className="backdrop-image"
            style={{ backgroundImage: `url(${artImageUrl})` }}
          />
        )}
        <div className="media-info-card">
          <div className="d-flex flex-column flex-md-row">
            <div className="media-info-poster-wrapper">
              {posterImageUrl ? (
                <img
                  src={posterImageUrl}
                  alt={details.title}
                  className="media-info-poster"
                />
              ) : (
                <div className="media-info-poster-placeholder">
                  <span className="text-muted">No Poster</span>
                </div>
              )}
              {details.studio && (
                <p className="text-muted text-center mt-2 mb-0 studio-name">
                  <em>{details.studio}</em>
                </p>
              )}
            </div>
            <div className="media-info-main flex-grow-1">
              <h1 className="mb-3">{details.title}</h1>
              <div className="media-info-metadata mb-3">
                <div
                  className="d-flex align-items-center flex-wrap"
                  style={{ gap: '0.5rem' }}
                >
                  {details.year && (
                    <span className="text-muted">{details.year}</span>
                  )}
                  {details.duration && (
                    <span className="text-muted">
                      {formatDuration(details.duration)}
                    </span>
                  )}
                  {details.contentRating && (
                    <span className="badge badge-light">
                      {details.contentRating}
                    </span>
                  )}
                </div>
              </div>
              <div className="summary-wrapper">
                <p
                  ref={summaryRef}
                  className={`summary-text ${!isSummaryExpanded ? 'clamped' : ''}`}
                >
                  {details.summary}
                </p>
                {isSummaryTruncated && !isSummaryExpanded && (
                  <button
                    className="btn btn-link p-0"
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  >
                    More
                  </button>
                )}
                {isSummaryExpanded && (
                  <button
                    className="btn btn-link p-0"
                    onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                  >
                    Less
                  </button>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    const state = location.state as {
                      fromLibrary?: string;
                    } | null;
                    if (state?.fromLibrary) {
                      navigate(state.fromLibrary);
                    } else {
                      navigate('/');
                    }
                  }}
                  className="btn btn-secondary"
                >
                  &larr; Back
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="details-content mt-4">
          <h2 className="mb-3">Available On</h2>
          {details.itemType === 'movie' && (
            <div className="sources-stack">
              {details.availableOn.map((server) => {
                const allSubtitles = server.versions.flatMap(
                  (v) => v.subtitles
                );
                const uniqueSubtitles = [...new Set(allSubtitles)];

                return (
                  <div key={server.serverId} className="source-section">
                    <div className="d-flex align-items-start justify-content-between">
                      <div className="flex-grow-1 d-flex flex-column">
                        <h3 className="h4 mb-0">{server.serverName}</h3>
                        <div className="movie-details-card pt-2">
                          <div className="d-flex align-items-center flex-wrap">
                            {server.versions.map((v, i) => (
                              <span
                                key={i}
                                className="badge badge-secondary border mr-2 mb-1"
                              >
                                {formatResolution(v.videoResolution)}
                              </span>
                            ))}
                            {uniqueSubtitles.length > 0 && (
                              <div className="d-flex align-items-center">
                                <SubtitlesIcon className="text-muted mr-1" />
                                <span className="small text-muted">
                                  {uniqueSubtitles.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <a
                        href={getPlexUrl(server.serverId, server.ratingKey)}
                        onClick={(e) =>
                          handlePlexButtonClick(
                            e,
                            server.serverId,
                            server.ratingKey,
                            server.serverName
                          )
                        }
                        className="btn btn-warning btn-sm d-flex align-items-center align-self-center plex-open-button"
                      >
                        <PlexIcon /> Open
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {details.itemType === 'show' && (
            <div className="sources-stack">
              {details.availableOn.map((server) => (
                <div key={server.serverId} className="source-section">
                  <div className="d-flex align-items-start justify-content-between mb-3 flex-wrap">
                    <div className="flex-grow-1 d-flex flex-column">
                      <div>
                        <h3 className="h4 mb-0">{server.serverName}</h3>
                        {seasonCounts[server.serverId] !== undefined && (
                          <p className="text-muted small mb-0 mt-1">
                            {seasonCounts[server.serverId]}{' '}
                            {seasonCounts[server.serverId] === 1
                              ? 'season'
                              : 'seasons'}
                          </p>
                        )}
                      </div>
                    </div>
                    <a
                      href={getPlexUrl(server.serverId, server.ratingKey)}
                      onClick={(e) =>
                        handlePlexButtonClick(
                          e,
                          server.serverId,
                          server.ratingKey,
                          server.serverName
                        )
                      }
                      className="btn btn-warning btn-sm d-flex align-items-center align-self-center plex-open-button"
                    >
                      <PlexIcon /> Open
                    </a>
                  </div>
                  <div className="source-seasons-container">
                    <TVShowSeasons
                      showId={server.ratingKey}
                      serverId={server.serverId}
                      showGuid={details.guid}
                      showTitle={details.title}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)}>
        <ModalHeader toggle={() => setModalOpen(false)}>
          Open on Plex
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <p className="mb-0">
              This will open <strong>{details.title}</strong>
              {pendingServerName && (
                <>
                  {' on '}
                  <strong>{pendingServerName}</strong>
                </>
              )}
              {' in a new tab.'}
            </p>

            <p className="mb-0">
              You must be logged into the CSH Plex account for this link to
              work.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={confirmPlexOpen}>
            Open on Plex
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default MediaDetailsPage;
