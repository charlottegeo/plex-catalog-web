import { useEffect, useRef, useState } from 'react';
import { GroupedResult, MediaDetails, MediaVersion } from '../types';
import { useApiFetch } from '../utils/api';
import { formatDuration, formatResolution } from '../utils/formatting';
import { SubtitlesIcon } from './icons';

type LibraryResultCardProps = {
  item: GroupedResult;
};

const LibraryResultCard = ({ item }: LibraryResultCardProps) => {
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const apiFetch = useApiFetch();

  useEffect(() => {
    if (!cardRef.current || item.itemType !== 'movie') {
      return;
    }

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting) {
          observer.disconnect();
          try {
            const response = await apiFetch(
              `/api/media/${encodeURIComponent(item.guid ?? '')}`
            );
            if (response.ok) {
              const data = (await response.json()) as MediaDetails;
              const serverInfo = data.availableOn.find(
                (s) => s.serverId === item.servers[0].id
              );
              if (serverInfo) {
                setVersions(serverInfo.versions);
              }
            }
          } catch (error) {
            console.error(
              'Failed to fetch single-item details for card',
              error
            );
          }
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [item.guid, item.itemType, item.servers, apiFetch]);

  useEffect(() => {
    let objectUrl: string | null = null;
    const fetchImage = async () => {
      if (item.servers[0]?.id && item.thumbPath) {
        try {
          const imagePath = item.thumbPath.startsWith('/')
            ? item.thumbPath.substring(1)
            : item.thumbPath;
          const response = await apiFetch(
            `/api/servers/${item.servers[0].id}/image/${imagePath}?width=300&height=450`
          );
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          } else {
            setImageUrl(null);
          }
        } catch (error) {
          console.error('Failed to fetch image for card', error);
          setImageUrl(null);
        }
      } else {
        setImageUrl(null);
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [item.thumbPath, item.servers, apiFetch]);

  const hasSubtitles = versions.some((v) => v.subtitles.length > 0);

  const cardImage = imageUrl ? (
    <img src={imageUrl} alt={item.title} className="card-img-top card-poster" />
  ) : (
    <div className="card-img-top card-poster d-flex align--items-center justify-content-center bg-light">
      <span className="text-muted">No Image</span>
    </div>
  );

  return (
    <div className="card result-card h-100" ref={cardRef}>
      {cardImage}
      <div className="card-body p-2 d-flex flex-column">
        <h3 className="card-title h6 mb-1">{item.title}</h3>
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
          {item.itemType === 'movie' && (
            <div className="version-info mt-1">
              {versions.map((v, i) => (
                <span key={i} className="badge badge-secondary mr-1">
                  {formatResolution(v.videoResolution)}
                </span>
              ))}
              {hasSubtitles && <SubtitlesIcon />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LibraryResultCard;
