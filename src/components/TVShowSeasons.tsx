import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApiFetch } from '../utils/api';

type SeasonSummary = {
  id: string;
  title: string;
  summary?: string;
  thumbPath?: string;
  episodeCount: number;
};

type TVShowSeasonsProps = {
  showId: string;
  serverId: string;
  showGuid: string;
  showTitle: string;
};

const SeasonCard = ({ season, serverId, showGuid, showTitle }: { season: SeasonSummary, serverId: string, showGuid: string, showTitle: string }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const apiFetch = useApiFetch();

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchImage = async () => {
      if (season.thumbPath) {
        try {
          const imagePath = season.thumbPath.startsWith('/') ? season.thumbPath.substring(1) : season.thumbPath;
          const response = await apiFetch(`/api/servers/${serverId}/image/${imagePath}`);
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          }
        } catch (error) {
          console.error(`Failed to fetch image for season ${season.title}`, error);
        }
      }
    };
    fetchImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [season.thumbPath, serverId, apiFetch, season.title]);

  return (
    <Link
      to={`/servers/${serverId}/seasons/${season.id}`}
      key={season.id}
      state={{
        season: { title: season.title, summary: season.summary, thumbPath: season.thumbPath },
        show: { guid: showGuid, title: showTitle }
      }}
      className="season-link"
    >
      <div className="card season-card">
        {imageUrl ? (
          <img src={imageUrl} alt={season.title} className="card-img-top" />
        ) : (
          <div className="card-img-top skeleton skeleton-poster" style={{ aspectRatio: '2/3' }}></div>
        )}
        <div className="card-body p-2">
          <h5 className="card-title h6">{season.title}</h5>
          <p className="card-text small text-muted">
            {season.episodeCount} {season.episodeCount === 1 ? 'episode' : 'episodes'}
          </p>
        </div>
      </div>
    </Link>
  );
};

const TVShowSeasons = ({ showId, serverId, showGuid, showTitle }: TVShowSeasonsProps) => {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const apiFetch = useApiFetch();

  useEffect(() => {
    const fetchSeasons = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/servers/${serverId}/shows/${showId}/seasons`);
        if (response.ok) {
          const data = await response.json();
          setSeasons(data);
        }
      } catch (error) {
        console.error("Failed to fetch seasons:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeasons();
  }, [showId, serverId, apiFetch]);

  if (loading) {
    return (
      <div className="seasons-list">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="card season-card" key={index}>
            <div className="skeleton skeleton-poster" style={{ aspectRatio: '2/3' }}></div>
            <div className="card-body p-2">
              <div className="skeleton skeleton-text"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="seasons-list">
      {seasons.map(season => (
        <SeasonCard
          key={season.id}
          season={season}
          serverId={serverId}
          showGuid={showGuid}
          showTitle={showTitle}
        />
      ))}
    </div>
  );
};

export default TVShowSeasons;