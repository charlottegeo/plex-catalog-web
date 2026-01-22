import { useState, useEffect } from 'react';
import { useApiFetch } from '../utils/api';
import { Alert, Spinner } from 'reactstrap';
import { Server, Library } from '../types';
import ServerItem from '../components/ServerItem';
import './ServersPage.css';

const ServersPage = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [libraries, setLibraries] = useState<Record<string, Library[]>>({});
  const [openServerId, setOpenServerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiFetch = useApiFetch();

  useEffect(() => {
    const fetchServers = async () => {
      setLoading(true);
      try {
        const response = await apiFetch('/api/servers');
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        setServers((await response.json()) as Server[]);
      } catch (e: unknown) {
        setError(
          e instanceof Error ? e.message : 'An error occurred fetching servers'
        );
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
  }, [apiFetch]);

  const toggleServerLibraries = async (serverId: string) => {
    const server = servers.find((s) => s.id === serverId);
    if (!server || !server.isOnline) {
      return;
    }

    if (openServerId === serverId) {
      setOpenServerId(null);
      return;
    }
    setOpenServerId(serverId);
    if (!libraries[serverId]) {
      try {
        const response = await apiFetch(`/api/servers/${serverId}/libraries`);
        if (!response.ok) throw new Error('Failed to fetch libraries');
        const data = (await response.json()) as Library[];
        setLibraries((prev) => ({ ...prev, [serverId]: data }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error loading libraries');
      }
    }
  };

  const onlineServers = servers.filter((s) => s.isOnline);
  const offlineServers = servers.filter((s) => !s.isOnline);

  return (
    <div className="container mt-4">
      {error && (
        <Alert color="danger" toggle={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && (
        <div className="text-center py-5">
          <Spinner />
        </div>
      )}

      {!loading && (
        <div className="row">
          <div className="col-12 col-md-6 mb-4 mb-md-0">
            <div className="servers-online-section">
              <h2 className="mb-4">Online</h2>
              {onlineServers.length === 0 ? (
                <p className="text-muted">No servers online</p>
              ) : (
                onlineServers.map((server) => (
                  <ServerItem
                    key={server.id}
                    server={server}
                    libraries={libraries[server.id] || []}
                    isOpen={openServerId === server.id}
                    onToggle={() => toggleServerLibraries(server.id)}
                  />
                ))
              )}
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="servers-offline-section">
              <div className="mb-4">
                <h2 className="mb-1">
                  Offline{' '}
                  <small className="text-muted">(Wall of Shame)</small>{' '}
                </h2>
              </div>
              {offlineServers.length === 0 ? (
                <p className="text-muted">All servers are online!</p>
              ) : (
                offlineServers.map((server) => (
                  <ServerItem
                    key={server.id}
                    server={server}
                    libraries={[]}
                    isOpen={false}
                    onToggle={() => {}}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServersPage;
