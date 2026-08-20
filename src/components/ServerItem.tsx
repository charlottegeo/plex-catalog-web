import { Link } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Collapse,
  ListGroup,
  ListGroupItem,
} from 'reactstrap';
import { DbServer, Library } from '../types';
import {
  formatServerStatus,
  formatStatusSince,
  isServerOnline,
} from '../utils/formatting';
import './ServerItem.css';

interface ServerItemProps {
  server: DbServer;
  libraries: Library[];
  isOpen: boolean;
  onToggle: () => void;
}

const ServerItem = ({
  server,
  libraries,
  isOpen,
  onToggle,
}: ServerItemProps) => {
  const online = isServerOnline(server.status);
  const statusLabel = formatServerStatus(server.status);

  return (
    <Card className="mb-3 shadow-sm border">
      <CardHeader
        onClick={onToggle}
        style={{ cursor: online ? 'pointer' : 'default' }}
        className={`d-flex align-items-center justify-content-between p-3 server-header ${
          online ? 'server-online' : 'server-unavailable'
        }`}
      >
        <div className="d-flex align-items-center">
          <span
            className={`status-indicator mr-2 ${
              online ? 'status-online' : 'status-unavailable'
            }`}
            title={statusLabel}
          />
          <div className="d-flex flex-column">
            <h5 className="mb-0 d-flex align-items-center flex-wrap">
              <span>{server.name}</span>
              {!online && (
                <span className="badge badge-pill badge-secondary ml-2">
                  {statusLabel}
                </span>
              )}
            </h5>
            {server.ownerUsername && (
              <small className="text-muted">{server.ownerUsername}</small>
            )}
            {!online && (
              <small className="text-muted server-status-meta">
                {formatStatusSince(server.statusSince ?? server.lastSeen) ||
                  'since unknown'}
              </small>
            )}
          </div>
        </div>
        {online && <span className={`caret ${isOpen ? 'open' : ''}`} />}
      </CardHeader>
      <Collapse isOpen={isOpen}>
        <CardBody className="p-0">
          <ListGroup flush>
            {(libraries || []).map((lib) => (
              <ListGroupItem
                key={lib.key}
                action
                tag={Link}
                to={`/servers/${server.id}/libraries/${lib.key}/${encodeURIComponent(server.name)}/${encodeURIComponent(lib.title)}`}
                className="library-item-link"
              >
                {lib.title}
              </ListGroupItem>
            ))}
            {libraries && libraries.length === 0 && (
              <ListGroupItem className="text-muted py-3">
                No libraries found on this server.
              </ListGroupItem>
            )}
          </ListGroup>
        </CardBody>
      </Collapse>
    </Card>
  );
};

export default ServerItem;
