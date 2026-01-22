import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApiFetch } from '../utils/api';
import { ChevronLeftIcon, ChevronRightIcon } from './icons';

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

const SeasonCard = ({
  season,
  serverId,
  showGuid,
  showTitle,
}: {
  season: SeasonSummary;
  serverId: string;
  showGuid: string;
  showTitle: string;
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const apiFetch = useApiFetch();

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchImage = async () => {
      if (season.thumbPath) {
        try {
          const imagePath = season.thumbPath.startsWith('/')
            ? season.thumbPath.substring(1)
            : season.thumbPath;
          const response = await apiFetch(
            `/api/servers/${serverId}/image/${imagePath}?width=200&height=300`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          }
        } catch (error) {
          console.error(
            `Failed to fetch image for season ${season.title}`,
            error
          );
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
        season: {
          title: season.title,
          summary: season.summary,
          thumbPath: season.thumbPath,
        },
        show: { guid: showGuid, title: showTitle },
      }}
      className="season-link"
    >
      <div className="card season-card">
        {imageUrl ? (
          <img src={imageUrl} alt={season.title} className="card-img-top" />
        ) : (
          <div
            className="card-img-top skeleton skeleton-poster"
            style={{ aspectRatio: '2/3' }}
          ></div>
        )}
        <div className="card-body p-2">
          <h5 className="card-title h6">{season.title}</h5>
          <p className="card-text small text-muted">
            {season.episodeCount}{' '}
            {season.episodeCount === 1 ? 'episode' : 'episodes'}
          </p>
        </div>
      </div>
    </Link>
  );
};

const TVShowSeasons = ({
  showId,
  serverId,
  showGuid,
  showTitle,
}: TVShowSeasonsProps) => {
  const [seasons, setSeasons] = useState<SeasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const apiFetch = useApiFetch();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkForScrollPosition = useCallback(() => {
    const { current } = listRef;
    if (current) {
      const { scrollLeft, scrollWidth, clientWidth } = current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft !== scrollWidth - clientWidth);
    }
  }, []);

  const scrollContainer = (amount: number) => {
    if (listRef.current) {
      listRef.current.scrollLeft += amount;
    }
  };

  useEffect(() => {
    const fetchSeasons = async () => {
      setLoading(true);
      try {
        const response = await apiFetch(
          `/api/servers/${serverId}/shows/${showId}/seasons`
        );
        if (response.ok) {
          const data = (await response.json()) as SeasonSummary[];
          if (data.length === 1 && data[0].title === showTitle) {
            navigate(`/servers/${serverId}/seasons/${data[0].id}`, {
              replace: true,
              state: {
                season: {
                  title: data[0].title,
                  summary: data[0].summary,
                  thumbPath: data[0].thumbPath,
                },
                show: { guid: showGuid, title: showTitle },
              },
            });
            return;
          }
          setSeasons(data);
        }
      } catch (error) {
        console.error('Failed to fetch seasons:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSeasons();
  }, [showId, serverId, apiFetch, navigate, showTitle, showGuid]);

  useLayoutEffect(() => {
    const { current } = listRef;
    if (current) {
      checkForScrollPosition();
      current.addEventListener('scroll', checkForScrollPosition);
      window.addEventListener('resize', checkForScrollPosition);
    }

    return () => {
      if (current) {
        current.removeEventListener('scroll', checkForScrollPosition);
        window.removeEventListener('resize', checkForScrollPosition);
      }
    };
  }, [seasons, checkForScrollPosition]);

  if (loading) {
    return (
      <div className="seasons-list">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="card season-card" key={index}>
            <div
              className="skeleton skeleton-poster"
              style={{ aspectRatio: '2/3' }}
            ></div>
            <div className="card-body p-2">
              <div className="skeleton skeleton-text"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (seasons.length === 0) return null;

  return (
    <div className="seasons-list-wrapper">
      {canScrollLeft && (
        <button
          className="scroll-button left"
          onClick={() => scrollContainer(-300)}
        >
          <ChevronLeftIcon />
        </button>
      )}
      <div className="seasons-list" ref={listRef}>
        {seasons.map((season) => (
          <SeasonCard
            key={season.id}
            season={season}
            serverId={serverId}
            showGuid={showGuid}
            showTitle={showTitle}
          />
        ))}
      </div>
      {canScrollRight && (
        <button
          className="scroll-button right"
          onClick={() => scrollContainer(300)}
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
};

export default TVShowSeasons;
