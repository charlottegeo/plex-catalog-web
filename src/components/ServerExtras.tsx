import { useEffect, useState } from 'react';
import { PlexExtra } from '../types';
import { fetchExtras, useApiFetch } from '../utils/api';
import ExtraCard from './ExtraCard';
import './Extras.css';

type ServerExtrasProps = {
  serverId: string;
  ratingKey: string;
};

export default function ServerExtras({
  serverId,
  ratingKey,
}: ServerExtrasProps) {
  const [extras, setExtras] = useState<PlexExtra[]>([]);
  const apiFetch = useApiFetch();

  useEffect(() => {
    fetchExtras(apiFetch, serverId, ratingKey).then(setExtras);
  }, [serverId, ratingKey, apiFetch]);

  if (extras.length === 0) return null;

  return (
    <div className="extras-section mt-3">
      <h5 className="mb-2 text-muted small text-uppercase">Extras</h5>
      <div className="extras-scroller">
        {extras.map((extra, i) => (
          <ExtraCard key={i} extra={extra} serverId={serverId} />
        ))}
      </div>
    </div>
  );
}
