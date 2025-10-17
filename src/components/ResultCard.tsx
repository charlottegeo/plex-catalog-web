import { useState, useEffect } from 'react';
import { SubtitlesIcon } from './icons';
import { formatResolution } from '../utils/formatting';
import { GroupedResult, MediaDetails, MediaVersion } from '../types';
import { useApiFetch } from '../utils/api';

type ResultCardProps = {
  item: GroupedResult;
  displayMode?: 'search' | 'library';
};

const ResultCard = ({ item, displayMode = 'search' }: ResultCardProps) => {
  const [versions, setVersions] = useState<MediaVersion[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const isSingleServer = item.servers.length === 1;

  const apiFetch = useApiFetch();

  useEffect(() => {
    if (isSingleServer && item.itemType === 'movie') {
      const fetchDetails = async () => {
        try {
          const response = await apiFetch(`/api/media/${encodeURIComponent(item.guid)}`);
          if (response.ok) {
            const data = await response.json() as MediaDetails;
            const serverInfo = data.availableOn.find(s => s.serverId === item.servers[0].id);
            if (serverInfo) {
              setVersions(serverInfo.versions);
            }
          }
        } catch (error) {
          console.error("Failed to fetch single-item details", error);
        }
      };
      fetchDetails();
    } else {
      setVersions([]);
    }
  }, [item.guid, isSingleServer, item.servers, item.itemType, apiFetch]);

  useEffect(() => {
    let objectUrl: string | null = null;

    const fetchImage = async () => {
      if (item.servers[0]?.id && item.thumbPath) {
        try {
          const imagePath = item.thumbPath.startsWith('/') ? item.thumbPath.substring(1) : item.thumbPath;
          const response = await apiFetch(`/api/servers/${item.servers[0].id}/image/${imagePath}`);
          
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setImageUrl(objectUrl);
          } else {
            setImageUrl(null);
          }
        } catch (error) {
          console.error("Failed to fetch image", error);
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

  const hasSubtitles = versions.some(v => v.subtitles.length > 0);

  return (
    <div className="card result-card h-100">
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
        <h3 className="card-title h6 mb-1">{item.title}</h3>
        <p className="card-year text-muted small">{item.year}</p>

        <div className="server-pills mt-auto">
          {displayMode === 'library' ? (
            <div className="single-server-info">
              {item.itemType === 'movie' && (
                <div className="version-info mt-1">
                  {versions.map((v, i) => (
                    <span key={i} className="badge badge-soft-secondary mr-1">
                      {formatResolution(v.videoResolution)}
                    </span>
                  ))}
                  {hasSubtitles && <SubtitlesIcon />}
                </div>
              )}
            </div>
          ) : (
            isSingleServer ? (
              <div className="single-server-info">
                <span className="badge badge-light text-dark">{item.servers[0].name}</span>
                {item.itemType === 'movie' && (
                  <div className="version-info mt-1">
                    {versions.map((v, i) => (
                      <span key={i} className="badge badge-soft-secondary mr-1">
                        {formatResolution(v.videoResolution)}
                      </span>
                    ))}
                    {hasSubtitles && <SubtitlesIcon />}
                  </div>
                )}
              </div>
            ) : (
              item.servers.map((server) => (
                <span key={server.id} className="badge badge-light text-dark mr-1 mb-1">
                  {server.name}
                </span>
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultCard;