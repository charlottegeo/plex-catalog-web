import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GroupedResult } from '../types';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import LibraryResultCard from '../components/LibraryResultCard';
import { useApiFetch } from '../utils/api';

type LibraryItem = {
    guid: string;
    title: string;
    year?: number;
    thumb?: string;
    itemType: 'movie' | 'show';
};

const LibraryPage = () => {
    const { serverId, libraryKey, serverName, libraryName } = useParams<{ serverId: string; libraryKey: string; serverName: string; libraryName: string; }>();
    const [items, setItems] = useState<GroupedResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiFetch = useApiFetch();

    useEffect(() => {
        const fetchLibraryItems = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await apiFetch(`/api/servers/${serverId}/libraries/${libraryKey}`);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const data = await response.json() as LibraryItem[];

                const groupedResults = data.map(item => ({
                    guid: item.guid,
                    title: item.title,
                    year: item.year,
                    itemType: item.itemType,
                    thumbPath: item.thumb,
                    servers: [{ id: serverId!, name: decodeURIComponent(serverName!) }]
                }));

                setItems(groupedResults);
            } catch (e) {
                setError(e instanceof Error ? e.message : "An unknown error occurred");
            } finally {
                setLoading(false);
            }
        };

        fetchLibraryItems();
    }, [serverId, libraryKey, serverName, apiFetch]);

    return (
        <div className="container-fluid mt-4">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb">
                    <li className="breadcrumb-item"><Link to="/">Home</Link></li>
                    <li className="breadcrumb-item">{decodeURIComponent(serverName!)}</li>
                    <li className="breadcrumb-item active" aria-current="page">{decodeURIComponent(libraryName!)}</li>
                </ol>
            </nav>
            <h1 className="mb-4">Browsing: {decodeURIComponent(libraryName!)}</h1>

            {error && <div className="alert alert-danger">{error}</div>}
            
            <div className="results-grid">
                {loading ? (
                    Array.from({ length: 18 }).map((_, index) => <ResultCardSkeleton key={index} />)
                ) : (
                    items.map((item) => (
                        <Link to={`/media/${encodeURIComponent(item.guid)}`} key={item.guid} className="result-link">
                            <LibraryResultCard item={item} />
                        </Link>
                    ))
                )}
            </div>
            {!loading && items.length === 0 && <p className="mt-4">This library appears to be empty.</p>}
        </div>
    );
};

export default LibraryPage;

