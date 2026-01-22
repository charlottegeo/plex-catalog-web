import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { SubtitlesIcon, PlexIcon } from '../components/icons';
import {
  formatResolution,
  formatDuration,
  formatDate,
} from '../utils/formatting';
import './MediaDetailsPage.css';
import './SeasonPage.css';
import { useApiFetch } from '../utils/api';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';

const EpisodeSkeleton = () => (
  <div className="episode-card card mb-3">
    <div className="row no-gutters">
      <div className="col-md-4">
        <div
          className="skeleton skeleton-poster"
          style={{ aspectRatio: '16/9' }}
        ></div>
      </div>
      <div className="col-md-8">
        <div className="card-body">
          <div
            className="skeleton skeleton-text"
            style={{ width: '60%', height: '1.25rem' }}
          ></div>
          <div className="skeleton skeleton-text mt-2"></div>
        </div>
      </div>
    </div>
  </div>
);

type SeasonSummary = {
  id: string;
  title: string;
  summary?: string;
  thumbPath?: string;
};

type MediaVersion = { videoResolution: string; subtitles: string[] };
type EpisodeDetails = {
  id: string;
  title: string;
  summary?: string;
  thumbPath?: string;
  index: number | null;
  contentRating?: string;
  duration?: number;
  originallyAvailableAt?: string;
  versions: MediaVersion[];
};

type ShowInfo = {
  guid: string;
  title: string;
};

const EpisodeCard = ({
  episode,
  serverId,
  index,
}: {
  episode: EpisodeDetails;
  serverId: string;
  index: number;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isSummaryTruncated, setIsSummaryTruncated] = useState(false);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const apiFetch = useApiFetch();

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchImage = async () => {
      if (episode.thumbPath) {
        try {
          const imagePath = episode.thumbPath.startsWith('/')
            ? episode.thumbPath.substring(1)
            : episode.thumbPath;
          const response = await apiFetch(
            `/api/servers/${serverId}/image/${imagePath}`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          }
        } catch (error) {
          console.error(
            `Failed to fetch image for episode ${episode.title}`,
            error
          );
        }
      }
    };
    fetchImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [episode.thumbPath, serverId, apiFetch, episode.title]);

  const allSubtitles = episode.versions.flatMap((v) => v.subtitles);
  const uniqueSubtitles = [...new Set(allSubtitles)];

  useEffect(() => {
    const checkTruncation = () => {
      if (summaryRef.current && episode.summary) {
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
  }, [episode.summary, isSummaryExpanded]);

  return (
    <div className="episode-card card mb-3 shadow-sm border-0">
      <div className="row no-gutters">
        <div className="col-md-4 d-flex align-items-center justify-content-center">
          {imageUrl ? (
            <div className="episode-thumb-wrapper">
              <img
                src={imageUrl}
                className="episode-thumb"
                alt={episode.title}
              />
            </div>
          ) : (
            <div className="episode-thumb-wrapper">
              <div
                className="skeleton skeleton-poster episode-thumb"
                style={{ aspectRatio: '16/9' }}
              ></div>
            </div>
          )}
        </div>
        <div className="col-md-8">
          <div className="card-body">
            <h5 className="card-title">
              <span className="text-muted mr-2">{episode.index ?? index}.</span>{' '}
              {episode.title}
            </h5>
            {(episode.contentRating ||
              episode.duration ||
              episode.originallyAvailableAt) && (
              <p
                className="small text-muted mb-2 d-flex align-items-center flex-wrap"
                style={{ gap: '0.5rem' }}
              >
                {episode.duration && (
                  <span>{formatDuration(episode.duration)}</span>
                )}
                {episode.originallyAvailableAt && (
                  <span>{formatDate(episode.originallyAvailableAt)}</span>
                )}
                {episode.contentRating && (
                  <span className="badge badge-light">
                    {episode.contentRating}
                  </span>
                )}
              </p>
            )}
            <p
              ref={summaryRef}
              className={`card-text text-muted ${
                !isSummaryExpanded ? 'clamped-summary' : ''
              }`}
            >
              {episode.summary}
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
            <div
              className="version-info d-flex align-items-center"
              style={{ gap: '8px' }}
            >
              {episode.versions.map((v, i) => (
                <span key={i} className="badge badge-secondary border">
                  {formatResolution(v.videoResolution)}
                </span>
              ))}
              {uniqueSubtitles.length > 0 && (
                <>
                  <SubtitlesIcon className="ml-2 text-muted" />
                  <span className="small text-muted">
                    {uniqueSubtitles.join(', ')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SeasonPage = () => {
  const { serverId, seasonId } = useParams<{
    serverId: string;
    seasonId: string;
  }>();
  const location = useLocation();
  const season: SeasonSummary = location.state?.season;
  const show: ShowInfo = location.state?.show;
  const [episodes, setEpisodes] = useState<EpisodeDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonPosterUrl, setSeasonPosterUrl] = useState<string | null>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isSeasonSummaryTruncated, setIsSeasonSummaryTruncated] =
    useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingPlexUrl, setPendingPlexUrl] = useState<string | null>(null);
  const seasonSummaryRef = useRef<HTMLParagraphElement>(null);

  const apiFetch = useApiFetch();

  const isHiddenSeason = useMemo(() => {
    return season?.title === show?.title;
  }, [season, show]);

  const getPlexUrl = (serverIdValue: string, ratingKey: string) =>
    `https://app.plex.tv/web/#!/server/${serverIdValue}/details?key=%2Flibrary%2Fmetadata%2F${ratingKey}`;

  const handlePlexButtonClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    serverIdValue: string,
    ratingKey: string
  ) => {
    e.preventDefault();
    const url = getPlexUrl(serverIdValue, ratingKey);
    setPendingPlexUrl(url);
    setModalOpen(true);
  };

  const confirmPlexOpen = () => {
    if (pendingPlexUrl) {
      window.open(pendingPlexUrl, '_blank', 'noopener,noreferrer');
      setModalOpen(false);
      setPendingPlexUrl(null);
    }
  };

  useEffect(() => {
    const checkTruncation = () => {
      if (seasonSummaryRef.current && season?.summary) {
        const element = seasonSummaryRef.current;
        setIsSeasonSummaryTruncated(
          element.scrollHeight > element.clientHeight ||
            element.scrollWidth > element.clientWidth
        );
      } else {
        setIsSeasonSummaryTruncated(false);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [season?.summary, isSummaryExpanded]);

  useEffect(() => {
    if (!serverId || !seasonId) return;
    const fetchEpisodes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          `/api/servers/${serverId}/seasons/${seasonId}/episodes`
        );
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setEpisodes(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchEpisodes();
  }, [serverId, seasonId, apiFetch]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchSeasonPoster = async () => {
      if (serverId && season?.thumbPath) {
        try {
          const imagePath = season.thumbPath.startsWith('/')
            ? season.thumbPath.substring(1)
            : season.thumbPath;
          const response = await apiFetch(
            `/api/servers/${serverId}/image/${imagePath}`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setSeasonPosterUrl(objectUrl);
          }
        } catch (error) {
          console.error('Failed to fetch season poster', error);
        }
      }
    };
    fetchSeasonPoster();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [serverId, season, apiFetch]);

  return (
    <div className="container mt-4">
      <nav aria-label="breadcrumb" className="breadcrumb-container">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/">Search</Link>
          </li>
          {show &&
            (isHiddenSeason ? (
              <li className="breadcrumb-item active" aria-current="page">
                {show.title}
              </li>
            ) : (
              <>
                <li className="breadcrumb-item">
                  <Link to={`/media/${show.guid}`}>{show.title}</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  {season?.title || 'Season'}
                </li>
              </>
            ))}
        </ol>
      </nav>

      <div className="media-info-card season-page">
        <div className="d-flex flex-column flex-md-row">
          <div className="media-info-poster-wrapper">
            {seasonPosterUrl ? (
              <img
                src={seasonPosterUrl}
                alt={isHiddenSeason ? show?.title : season?.title}
                className="media-info-poster"
              />
            ) : (
              <div className="media-info-poster-placeholder">
                <span className="text-muted">No Poster</span>
              </div>
            )}
          </div>
          <div className="media-info-main flex-grow-1">
            <div className="d-flex flex-column flex-md-row align-items-start justify-content-between mb-3">
              <h1 className="mb-2 mb-md-0">
                {isHiddenSeason ? show?.title : season?.title || 'Season'}
              </h1>
              {serverId && seasonId && (
                <a
                  href={getPlexUrl(serverId, seasonId)}
                  onClick={(e) => handlePlexButtonClick(e, serverId, seasonId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-warning btn-sm plex-open-button"
                >
                  <PlexIcon /> Open
                </a>
              )}
            </div>
            <div className="summary-wrapper">
              <p
                ref={seasonSummaryRef}
                className={`summary-text ${!isSummaryExpanded ? 'clamped' : ''}`}
              >
                {season?.summary}
              </p>
              {isSeasonSummaryTruncated && !isSummaryExpanded && (
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
          </div>
        </div>
      </div>

      <div className="details-content mt-4">
        {error && <p className="text-danger">{error}</p>}
        <div className="episode-list">
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <EpisodeSkeleton key={index} />
              ))
            : episodes.map((episode, idx) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                  serverId={serverId!}
                  index={idx + 1}
                />
              ))}
        </div>
      </div>

      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)}>
        <ModalHeader toggle={() => setModalOpen(false)}>
          Open on Plex
        </ModalHeader>
        <ModalBody>
          <div className="text-center">
            <p className="mb-0">
              This will open{' '}
              <strong>{isHiddenSeason ? show?.title : season?.title}</strong> on
              Plex in a new tab.
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
    </div>
  );
};

export default SeasonPage;
