import { useEffect, useState } from 'react';
import { FaArrowUpRightFromSquare, FaCodeBranch } from 'react-icons/fa6';
import { SystemInfo } from '../types';
import { useApiFetch } from '../utils/api';
import { formatRelativeTime } from '../utils/formatting';
import './Footer.css';

type RepoVersionLinkProps = {
  label: string;
  url: string;
};

function RepoVersionLink({ label, url }: RepoVersionLinkProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="footer-repo-link text-muted"
      aria-label={`${label} repository`}
    >
      <FaCodeBranch />
      {label}
      <FaArrowUpRightFromSquare />
    </a>
  );
}

export default function Footer() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const apiFetch = useApiFetch();
  const frontendRepoUrl = import.meta.env.VITE_FRONTEND_REPO_URL as
    | string
    | undefined;
  const backendRepoUrl = import.meta.env.VITE_BACKEND_REPO_URL as
    | string
    | undefined;

  const getMinutesUntilNextSync = (info: SystemInfo): number => {
    if (!info.lastUpdated) return info.syncIntervalMinutes;
    const lastUpdatedMs = new Date(info.lastUpdated).getTime();
    if (Number.isNaN(lastUpdatedMs)) return info.syncIntervalMinutes;
    const elapsedMinutes = Math.floor((Date.now() - lastUpdatedMs) / 60000);
    return Math.max(0, info.syncIntervalMinutes - elapsedMinutes);
  };

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
                  <span className="mr-3">
                    <strong>{systemInfo.onlineServers}</strong> Online +{' '}
                    <strong>{systemInfo.offlineServers}</strong> Offline Servers
                  </span>
                </div>

                {(frontendRepoUrl || backendRepoUrl) && (
                  <div className="footer-repo-links mb-2 mb-md-0 text-center">
                    {frontendRepoUrl && (
                      <RepoVersionLink label="Frontend" url={frontendRepoUrl} />
                    )}
                    {backendRepoUrl && (
                      <RepoVersionLink label="Backend" url={backendRepoUrl} />
                    )}
                  </div>
                )}

                <div className="text-center text-md-end">
                  {systemInfo.syncInProgress ? (
                    <span className="sync-indicator">
                      <span className="sync-indicator__dot" />
                      <span className="sync-indicator__dot" />
                      <span className="sync-indicator__dot" />
                      Syncing database
                    </span>
                  ) : (
                    <>
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
                        Next sync in {getMinutesUntilNextSync(systemInfo)}{' '}
                        minutes
                      </span>
                    </>
                  )}
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
