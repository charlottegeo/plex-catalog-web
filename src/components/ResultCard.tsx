import { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import { SubtitlesIcon } from './icons';
import { formatResolution, formatDuration } from '../utils/formatting';
import { GroupedResult, MediaDetails } from '../types';
import { useApiFetch } from '../utils/api';

type ResultCardProps = {
  item: GroupedResult;
  displayMode?: 'search' | 'library';
  hideTypeTag?: boolean;
};

const ServerPills = ({
  servers,
}: {
  servers: Array<{ id: string; name: string }>;
}) => {
  const [visibleCount, setVisibleCount] = useState(servers.length);
  const containerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    if (measured || !containerRef.current) return;

    const children = Array.from(containerRef.current.children) as HTMLElement[];
    if (children.length <= 1) {
      setMeasured(true);
      return;
    }

    const firstTop = children[0].offsetTop;
    let breakIndex = -1;

    for (let i = 1; i < children.length; i++) {
      if (children[i].offsetTop > firstTop) {
        breakIndex = i;
        break;
      }
    }

    if (breakIndex !== -1) {
      setVisibleCount(breakIndex);
    }
    setMeasured(true);
  }, [measured, servers]);

  if (!measured) {
    return (
      <div ref={containerRef}>
        {servers.map((server) => (
          <span
            key={server.id}
            className="badge badge-light text-dark mr-1 mb-1 border"
          >
            {server.name}
          </span>
        ))}
      </div>
    );
  }

  const visibleServers = servers.slice(0, visibleCount);
  const hiddenCount = servers.length - visibleCount;

  return (
    <div>
      {visibleServers.map((server) => (
        <span
          key={server.id}
          className="badge badge-light text-dark mr-1 mb-1 border"
        >
          {server.name}
        </span>
      ))}
      {hiddenCount > 0 && (
        <span className="small text-muted ml-1">+{hiddenCount}</span>
      )}
    </div>
  );
};

const sortResolutions = (resolutions: string[]): string[] => {
  const resolutionOrder: Record<string, number> = {
    '8k': 8,
    '4320': 8,
    '4k': 7,
    '2160': 7,
    '1080': 6,
    '1080p': 6,
    '720': 5,
    '720p': 5,
    '480': 4,
    '480p': 4,
    '360': 3,
    '360p': 3,
    '240': 2,
    '240p': 2,
  };

  return [...resolutions].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aOrder =
      Object.entries(resolutionOrder).find(([key]) =>
        aLower.includes(key)
      )?.[1] || 0;
    const bOrder =
      Object.entries(resolutionOrder).find(([key]) =>
        bLower.includes(key)
      )?.[1] || 0;
    return bOrder - aOrder;
  });
};

const ResultCard = ({
  item,
  displayMode = 'search',
  hideTypeTag = false,
}: ResultCardProps) => {
  const [mediaDetails, setMediaDetails] = useState<MediaDetails | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isSingleServer = item.servers.length === 1;

  const apiFetch = useApiFetch();

  const topResolutions = useMemo(() => {
    if (!mediaDetails || item.itemType !== 'movie') return [];
    const allResolutions = mediaDetails.availableOn.flatMap((server) =>
      server.versions.map((v) => v.videoResolution)
    );
    const uniqueResolutions = [...new Set(allResolutions)];
    const sorted = sortResolutions(uniqueResolutions);
    return sorted.slice(0, 3).map(formatResolution);
  }, [mediaDetails, item.itemType]);

  const hasSubtitles = useMemo(() => {
    if (!mediaDetails || item.itemType !== 'movie') return false;
    return mediaDetails.availableOn.some((server) =>
      server.versions.some((v) => v.subtitles.length > 0)
    );
  }, [mediaDetails, item.itemType]);

  useEffect(() => {
    if (!cardRef.current || item.itemType !== 'movie') return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          try {
            const fullGuid = item.guid.startsWith('plex://')
              ? item.guid
              : `plex://${item.guid}`;
            const response = await apiFetch(
              `/api/media/${encodeURIComponent(fullGuid)}`
            );
            if (response.ok) {
              const data = (await response.json()) as MediaDetails;
              setMediaDetails(data);
            }
          } catch (error) {
            console.error('Failed to fetch details', error);
          }
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [item.guid, item.itemType, apiFetch]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchImage = async () => {
      if (item.servers[0]?.id && item.thumbPath) {
        try {
          const imagePath = item.thumbPath.startsWith('/')
            ? item.thumbPath.substring(1)
            : item.thumbPath;
          const response = await apiFetch(
            `/api/servers/${item.servers[0].id}/image/${imagePath}`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          }
        } catch (error) {
          console.error('Failed to fetch image', error);
        }
      }
    };
    fetchImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.thumbPath, item.servers, apiFetch]);

  return (
    <div className="card result-card h-100" ref={cardRef}>
      {!hideTypeTag && (
        <div className="metadata-badge text-uppercase">
          {item.itemType === 'movie' ? 'Movie' : 'Show'}
        </div>
      )}

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.title}
          className="card-img-top card-poster"
        />
      ) : (
        <div className="card-img-top card-poster d-flex align-items-center justify-content-center bg-light">
          <span className="text-muted">No Image</span>
        </div>
      )}

      <div className="card-body p-2 d-flex flex-column">
        <h3 className="card-title h6 mb-1 text-dark">{item.title}</h3>
        <div className="mb-1">
          <p
            className="card-year text-muted small mb-0 d-flex align-items-center flex-wrap"
            style={{ gap: '0.5rem' }}
          >
            {item.year && <span>{item.year}</span>}
            {item.contentRating && <span>{item.contentRating}</span>}
            {item.duration && <span>{formatDuration(item.duration)}</span>}
          </p>
        </div>

        <div className="server-pills mt-auto">
          {displayMode === 'library' ? (
            <div className="single-server-info">
              {item.itemType === 'movie' && topResolutions.length > 0 && (
                <div className="version-info mt-1">
                  {topResolutions.map((res, i) => (
                    <span key={i} className="badge badge-secondary mr-1">
                      {res}
                    </span>
                  ))}
                  {hasSubtitles && <SubtitlesIcon />}
                </div>
              )}
            </div>
          ) : isSingleServer ? (
            <div className="single-server-info">
              <span className="badge badge-light text-dark border">
                {item.servers[0].name}
              </span>
              {item.itemType === 'movie' && topResolutions.length > 0 && (
                <div className="version-info mt-1">
                  {topResolutions.map((res, i) => (
                    <span key={i} className="badge badge-secondary mr-1">
                      {res}
                    </span>
                  ))}
                  {hasSubtitles && <SubtitlesIcon />}
                </div>
              )}
            </div>
          ) : (
            <>
              <ServerPills servers={item.servers} />
              {item.itemType === 'movie' && topResolutions.length > 0 && (
                <div className="version-info mt-1">
                  {topResolutions.map((res, i) => (
                    <span key={i} className="badge badge-secondary mr-1">
                      {res}
                    </span>
                  ))}
                  {hasSubtitles && <SubtitlesIcon />}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
