import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { SubtitlesIcon } from '../components/icons';
import { formatResolution } from '../utils/formatting';
import './SeasonPage.css';
import { useApiFetch } from '../utils/api';

const EpisodeSkeleton = () => (
  <div className="episode-card card mb-3">
    <div className="row no-gutters">
      <div className="col-md-3">
        <div className="skeleton skeleton-poster" style={{ aspectRatio: '16/9' }}></div>
      </div>
      <div className="col-md-9">
        <div className="card-body">
          <div className="skeleton skeleton-text" style={{ width: '60%', height: '1.25rem' }}></div>
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
  versions: MediaVersion[];
};

type ShowInfo = {
  guid: string;
  title: string;
}

const EpisodeCard = ({ episode, serverId }: { episode: EpisodeDetails, serverId: string }) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const apiFetch = useApiFetch();

    useEffect(() => {
        let objectUrl: string | null = null;
        const fetchImage = async () => {
            if (episode.thumbPath) {
                try {
                    const imagePath = episode.thumbPath.startsWith('/') ? episode.thumbPath.substring(1) : episode.thumbPath;
                    const response = await apiFetch(`/api/servers/${serverId}/image/${imagePath}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        objectUrl = URL.createObjectURL(blob);
                        setImageUrl(objectUrl);
                    }
                } catch (error) {
                    console.error(`Failed to fetch image for episode ${episode.title}`, error);
                }
            }
        };
        fetchImage();
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [episode.thumbPath, serverId, apiFetch, episode.title]);

    const allSubtitles = episode.versions.flatMap(v => v.subtitles);
    const uniqueSubtitles = [...new Set(allSubtitles)];

    return (
        <div className="episode-card card mb-3">
            <div className="row no-gutters">
                <div className="col-md-3 d-flex align-items-center justify-content-center">
                    {imageUrl ? (
                        <img src={imageUrl} className="episode-thumb" alt={episode.title} />
                    ) : (
                        <div className="skeleton skeleton-poster episode-thumb" style={{ aspectRatio: '16/9' }}></div>
                    )}
                </div>
                <div className="col-md-9">
                    <div className="card-body">
                        <h5 className="card-title">{episode.title}</h5>
                        <p className="card-text text-muted small">{episode.summary}</p>
                        <div className="version-info d-flex align-items-center" style={{ gap: '8px' }}>
                            {episode.versions.map((v, i) => (
                                <span key={i} className="badge badge-soft-secondary">{formatResolution(v.videoResolution)}</span>
                            ))}
                            {uniqueSubtitles.length > 0 && <><SubtitlesIcon /> <span>{uniqueSubtitles.join(', ')}</span></>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SeasonPage = () => {
    const { serverId, seasonId } = useParams<{ serverId: string; seasonId: string }>();
    const location = useLocation();
    const season: SeasonSummary = location.state?.season;
    const show: ShowInfo = location.state?.show;
    const [episodes, setEpisodes] = useState<EpisodeDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [seasonPosterUrl, setSeasonPosterUrl] = useState<string | null>(null);

    const apiFetch = useApiFetch();

    useEffect(() => {
        if (!serverId || !seasonId) return;
        const fetchEpisodes = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiFetch(`/api/servers/${serverId}/seasons/${seasonId}/episodes`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json();
                setEpisodes(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : "An unknown error occurred");
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
                    const imagePath = season.thumbPath.startsWith('/') ? season.thumbPath.substring(1) : season.thumbPath;
                    const response = await apiFetch(`/api/servers/${serverId}/image/${imagePath}`);
                    if (response.ok) {
                        const blob = await response.blob();
                        objectUrl = URL.createObjectURL(blob);
                        setSeasonPosterUrl(objectUrl);
                    }
                } catch (error) {
                    console.error("Failed to fetch season poster", error);
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
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Link to="/">Search</Link></li>
                    {show && (
                        <li className="breadcrumb-item">
                            <Link to={`/media/${encodeURIComponent(show.guid)}`}>{show.title}</Link>
                        </li>
                    )}
                    <li className="breadcrumb-item active" aria-current="page">{season?.title || 'Season'}</li>
                </ol>
            </nav>

            <div className="row mb-5">
                <div className="col-md-4 col-lg-3">
                    {seasonPosterUrl ? (
                        <img src={seasonPosterUrl} alt={season.title} className="img-fluid rounded shadow" />
                    ) : (
                        <div className="skeleton skeleton-poster img-fluid rounded shadow"></div>
                    )}
                </div>
                <div className="col-md-8 col-lg-9">
                    <h1 className="display-4">{season?.title}</h1>
                    <p className="lead">{season?.summary}</p>
                </div>
            </div>

            <h2 className="mb-4">Episodes</h2>
            {error && <p className="text-danger">{error}</p>}
            <div className="episode-list">
                {loading ? (
                    Array.from({ length: 5 }).map((_, index) => <EpisodeSkeleton key={index} />)
                ) : (
                    episodes.map(episode => (
                        <EpisodeCard key={episode.id} episode={episode} serverId={serverId!} />
                    ))
                )}
            </div>
        </div>
    );
};

export default SeasonPage;