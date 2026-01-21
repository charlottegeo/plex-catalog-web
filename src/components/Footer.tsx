import { useEffect, useState } from 'react';
import { useApiFetch } from '../utils/api';
import { SystemInfo } from '../types';
import { formatRelativeTime } from '../utils/formatting';

export default function Footer() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const apiFetch = useApiFetch();

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await apiFetch('/api/system/info');
        if (response.ok) {
          const data = (await response.json()) as SystemInfo;
          setSystemInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch system info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemInfo();
  }, [apiFetch]);

  return (
    <footer id="footer" className="mt-auto py-4 border-top">
      <div className="container">
        <div className="row">
          <div className="col-lg-12">
            {loading ? (
              <p className="text-muted small text-center">
                Loading system info...
              </p>
            ) : systemInfo ? (
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center text-muted small">
                <div className="mb-2 mb-md-0">
                  <span className="mr-3">
                    <strong>{systemInfo.totalMovies}</strong> Movies
                  </span>
                  <span className="mr-3">
                    <strong>{systemInfo.totalShows}</strong> Shows
                  </span>
                  <span>
                    <strong>{systemInfo.serverCount}</strong> Server
                    {systemInfo.serverCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="text-center text-md-end">
                  <span>
                    Last updated:{' '}
                    <strong>
                      {formatRelativeTime(systemInfo.lastUpdated)}
                    </strong>
                  </span>
                  <span className="mx-2 d-none d-md-inline text-opacity-25">
                    |
                  </span>
                  <span className="d-block d-md-inline">
                    Syncs every {systemInfo.syncIntervalHours} hours
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted small text-center">
                Unable to load system info
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
