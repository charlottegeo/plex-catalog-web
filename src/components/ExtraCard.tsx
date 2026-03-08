import { useEffect, useState } from 'react';
import { PlexExtra } from '../types';
import { useApiFetch } from '../utils/api';
import { formatExtraType } from '../utils/formatting';

type ExtraCardProps = {
  extra: PlexExtra;
  serverId: string;
};

export default function ExtraCard({ extra, serverId }: ExtraCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const apiFetch = useApiFetch();

  useEffect(() => {
    if (!extra.thumb) return;

    let objectUrl: string | null = null;
    const fetchImage = async () => {
      try {
        const imagePath = extra.thumb!.startsWith('/')
          ? extra.thumb!.substring(1)
          : extra.thumb!;
        const response = await apiFetch(
          `/api/servers/${serverId}/image/${imagePath}?width=300&height=170`
        );
        if (response.ok) {
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          setImageUrl(objectUrl);
        }
      } catch (error) {
        console.error(`Failed to fetch extra image for ${extra.title}`, error);
      }
    };

    fetchImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [extra.thumb, extra.title, serverId, apiFetch]);

  return (
    <div className="extra-item">
      <div className="extra-thumb-container">
        {imageUrl ? (
          <img src={imageUrl} alt={extra.title} />
        ) : (
          <div
            className="skeleton skeleton-poster"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>
      <span className="extra-title">{extra.title}</span>
      <span className="extra-type">{formatExtraType(extra.extraType)}</span>
    </div>
  );
}
