import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import TVShowSeasons from '../components/TVShowSeasons';
import './MediaDetailsPage.css';
import { SubtitlesIcon } from '../components/icons';
import { formatResolution } from '../utils/formatting';
import { useApiFetch } from '../utils/api';

const MediaDetailsSkeleton = () => (
    <div className="container mt-4">
        <div className="details-content">
            <div className="row mb-5">
                <div className="col-md-4 col-lg-3 mb-4 mb-md-0">
                    <div className="skeleton skeleton-poster" style={{ aspectRatio: '2/3' }}></div>
                </div>
                <div className="col-md-8 col-lg-9">
                    <div className="skeleton skeleton-text" style={{ height: '2.5rem', width: '80%', marginBottom: '1rem' }}></div>
                    <div className="skeleton skeleton-text" style={{ height: '1rem', width: '20%', marginBottom: '1.5rem' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '100%' }}></div>
                    <div className="skeleton skeleton-text" style={{ width: '95%' }}></div>
                </div>
            </div>
        </div>
    </div>
);

type MediaVersion = { videoResolution: string; subtitles: string[]; };
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
  availableOn: ServerAvailability[];
};

const MediaDetailsPage = () => {
  const { guid } = useParams<{ guid: string }>();
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [artImageUrl, setArtImageUrl] = useState<string | null>(null);
  const [posterImageUrl, setPosterImageUrl] = useState<string | null>(null);

  const apiFetch = useApiFetch();

  useEffect(() => {
    if (!guid) return;
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(`/api/media/${encodeURIComponent(guid)}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setDetails(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
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
          const imagePath = details.artPath.startsWith('/') ? details.artPath.substring(1) : details.artPath;
          const response = await apiFetch(`/api/servers/${serverId}/image/${imagePath}`);
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setArtImageUrl(objectUrl);
          }
        } catch (error) {
          console.error("Failed to fetch art image", error);
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
          const imagePath = details.thumbPath.startsWith('/') ? details.thumbPath.substring(1) : details.thumbPath;
          const response = await apiFetch(`/api/servers/${serverId}/image/${imagePath}`);
          if (response.ok) {
            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            setPosterImageUrl(objectUrl);
          }
        } catch (error) {
          console.error("Failed to fetch poster image", error);
        }
      }
    };
    fetchPosterImage();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [details, apiFetch]);


  if (loading) return <MediaDetailsSkeleton />;
  if (error) return <p className="text-danger">{error}</p>;
  if (!details) return <p>Media not found.</p>;
    
  return (
    <div className="container mt-4">
      {artImageUrl && <div className="backdrop-image" style={{ backgroundImage: `url(${artImageUrl})` }} />}
      <div className="details-content">
        <div className="row mb-5">
          <div className="col-md-4 col-lg-3 mb-4 mb-md-0">
            {posterImageUrl ? (
              <img src={posterImageUrl} alt={details.title} className="img-fluid rounded shadow-lg details-poster" />
            ) : (
              <div className="details-poster-placeholder d-flex align-items-center justify-content-center bg-light rounded shadow-lg">
                <span className="text-muted">No Poster</span>
              </div>
            )}
          </div>
          <div className="col-md-8 col-lg-9">
            <h1 className="display-4">{details.title}</h1>
            <p className="lead text-muted">{details.year}</p>
            <p>{details.summary}</p>
            <Link to="/" className="btn btn-secondary mt-3">&larr; Back to Search</Link>
          </div>
        </div>

        <h2 className="mb-3">Available On</h2>
        {details.itemType === 'movie' && (
          <table className="table table-hover availability-table">
            <thead>
              <tr>
                <th scope="col">Server</th>
                <th scope="col">Resolution</th>
                <th scope="col">Subtitles</th>
              </tr>
            </thead>
            <tbody>
              {details.availableOn.map(server => {
                const allSubtitles = server.versions.flatMap(v => v.subtitles);
                const uniqueSubtitles = [...new Set(allSubtitles)];

                return (
                  <tr key={server.serverId}>
                    <td data-label="Server" className="font-weight-bold">{server.serverName}</td>
                    <td data-label="Resolution">
                      {server.versions.map((version, index) => (
                        <span key={index} className="badge badge-soft-secondary mr-1">
                          {formatResolution(version.videoResolution)}
                        </span>
                      ))}
                    </td>
                    <td data-label="Subtitles">
                      {uniqueSubtitles.length > 0 ? (
                        <div className="d-flex align-items-center justify-content-end justify-content-md-start" style={{ gap: '8px' }}>
                          <SubtitlesIcon className="flex-shrink-0" />
                          <span>{uniqueSubtitles.join(', ')}</span>
                        </div>
                      ) : <span className="text-muted">None</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {details.itemType === 'show' && (
          <div>
            {details.availableOn.map(server => (
              <div key={server.serverId} className="card server-details-card mb-4">
                <div className="card-header h5">{server.serverName}</div>
                <div className="card-body">
                  <TVShowSeasons showId={server.ratingKey} serverId={server.serverId} showGuid={details.guid} showTitle={details.title} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaDetailsPage;
