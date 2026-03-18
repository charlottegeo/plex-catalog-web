import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { DiscoverResult, GroupedResult, MediaDetails } from '../types';
import { useApiFetch } from '../utils/api';
import { formatDuration, formatResolution } from '../utils/formatting';
import { SubtitlesIcon } from './icons';

type ResultCardItem = GroupedResult | DiscoverResult;

function isGroupedResult(item: ResultCardItem): item is GroupedResult {
  return 'servers' in item && Array.isArray(item.servers);
}

function getItemType(item: ResultCardItem): string {
  return 'itemType' in item ? item.itemType : item.type;
}

type ResultCardProps = {
  item: ResultCardItem;
  displayMode?: 'search' | 'library';
  hideTypeTag?: boolean;
  actionElement?: React.ReactNode;
  imageUrl?: string | null;
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
  actionElement,
  imageUrl: imageUrlProp,
}: ResultCardProps) => {
  const [mediaDetails, setMediaDetails] = useState<MediaDetails | null>(null);
  const [fetchedImageUrl, setFetchedImageUrl] = useState<string | null>(null);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const itemType = getItemType(item);
  const isGrouped = isGroupedResult(item);
  const isSingleServer = isGrouped && item.servers.length === 1;
  const imageUrl = resolvedImageUrl ?? fetchedImageUrl;

  const apiFetch = useApiFetch();

  const topResolutions = useMemo(() => {
    if (!mediaDetails || itemType !== 'movie') return [];
    const allResolutions = mediaDetails.availableOn.flatMap((server) =>
      server.versions.map((v) => v.videoResolution)
    );
    const uniqueResolutions = [...new Set(allResolutions)];
    const sorted = sortResolutions(uniqueResolutions);
    return sorted.slice(0, 3).map(formatResolution);
  }, [mediaDetails, itemType]);

  const hasSubtitles = useMemo(() => {
    if (!mediaDetails || itemType !== 'movie') return false;
    return mediaDetails.availableOn.some((server) =>
      server.versions.some((v) => v.subtitles.length > 0)
    );
  }, [mediaDetails, itemType]);

  const seasonCount =
    itemType === 'show' && 'childCount' in item && item.childCount
      ? `${item.childCount} Season${item.childCount === 1 ? '' : 's'}`
      : null;

  const itemKey = isGrouped
    ? ((item as GroupedResult).guid ?? '')
    : item.ratingKey;
  const thumbPath = isGrouped ? (item as GroupedResult).thumbPath : undefined;
  const servers = isGrouped ? (item as GroupedResult).servers : undefined;

  useEffect(() => {
    if (!cardRef.current || itemType !== 'movie' || !isGrouped) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          try {
            const response = await apiFetch(
              `/api/media/${encodeURIComponent(itemKey)}`
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
  }, [isGrouped, itemKey, itemType, apiFetch]);

  useEffect(() => {
    if (imageUrlProp == null) {
      setResolvedImageUrl(null);
      return;
    }

    if (!imageUrlProp.startsWith('/api/')) {
      setResolvedImageUrl(imageUrlProp);
      return;
    }

    let objectUrl: string | null = null;
    const fetchProxiedImage = async () => {
      try {
        const response = await apiFetch(imageUrlProp);
        if (!response.ok) return;
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setResolvedImageUrl(objectUrl);
      } catch (error) {
        console.error('Failed to fetch proxied image', error);
      }
    };

    fetchProxiedImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrlProp, apiFetch]);

  useEffect(() => {
    if (imageUrlProp != null) return;
    let objectUrl: string | null = null;
    const fetchImage = async () => {
      if (!isGrouped || !servers || !thumbPath) return;
      if (servers[0]?.id && thumbPath) {
        try {
          const imagePath = thumbPath.startsWith('/')
            ? thumbPath.substring(1)
            : thumbPath;
          const response = await apiFetch(
            `/api/servers/${servers[0].id}/image/${imagePath}?width=300&height=450`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setFetchedImageUrl(objectUrl);
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
  }, [imageUrlProp, isGrouped, thumbPath, servers, apiFetch]);

  const duration =
    'duration' in item && item.duration ? formatDuration(item.duration) : null;

  return (
    <div className="card result-card h-100" ref={cardRef}>
      {!hideTypeTag && (
        <div className="metadata-badge text-uppercase">
          {itemType === 'movie' ? 'Movie' : 'Show'}
        </div>
      )}

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.title}
          className="card-img-top card-poster"
          style={{ aspectRatio: '2/3', objectFit: 'cover', width: '100%' }}
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
            {'contentRating' in item && item.contentRating && (
              <span>{item.contentRating}</span>
            )}
            {duration && <span>{duration}</span>}
            {seasonCount && <span>{seasonCount}</span>}
          </p>
        </div>

        <div className="server-pills mt-auto">
          {isGrouped &&
            (displayMode === 'library' ? (
              <div className="single-server-info">
                {itemType === 'movie' && topResolutions.length > 0 && (
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
            ) : isSingleServer && isGrouped ? (
              <div className="single-server-info">
                <span className="badge badge-light text-dark border">
                  {item.servers[0].name}
                </span>
                {itemType === 'movie' && topResolutions.length > 0 && (
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
            ) : isGrouped ? (
              <>
                <ServerPills servers={item.servers} />
                {itemType === 'movie' && topResolutions.length > 0 && (
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
            ) : null)}
          {actionElement}
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
