import { Link } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardBody,
  Collapse,
  ListGroup,
  ListGroupItem,
} from 'reactstrap';
import { DbServer, Library } from '../types';
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
  return (
    <Card className="mb-3 shadow-sm border">
      <CardHeader
        onClick={onToggle}
        style={{ cursor: server.isOnline ? 'pointer' : 'default' }}
        className={`d-flex align-items-center justify-content-between p-3 server-header ${
          server.isOnline ? 'server-online' : 'server-offline'
        }`}
      >
        <div className="d-flex align-items-center">
          <span
            className={`status-indicator mr-2 ${
              server.isOnline ? 'status-online' : 'status-offline'
            }`}
          />
          <h5 className="mb-0">{server.name}</h5>
        </div>
        {server.isOnline && (
          <span className={`caret ${isOpen ? 'open' : ''}`} />
        )}
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
