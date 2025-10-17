//import {useOidcFetch, useOidc, useOidcAccessToken, useOidcIdToken} from "@axa-fr/react-oidc";
//import {apiPrefix} from "../configuration";
//import Authenticating from "../callbacks/Authenticating";
//import AuthenticationError from "../callbacks/AuthenticationError";
//import SessionLost from "../callbacks/SessionLost";
//import UserInfo from "../UserInfo";

import { useState, useEffect, FormEvent, useMemo } from 'react';
import { useApiFetch } from '../utils/api';
import { Link } from 'react-router-dom';
import { ListGroup, ListGroupItem, Collapse } from 'reactstrap';
import ResultCard from '../components/ResultCard';
import { GroupedResult } from '../types';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import './Home.css';

type SearchResult = {
  guid: string;
  title: string;
  year?: number;
  thumbPath?: string;
  serverId: string;
  serverName: string;
  itemType: 'movie' | 'show';
};

type Server = {
  id: string;
  name: string;
  isOnline: boolean;
};

type Library = {
  key: string;
  title: string;
}

type FilterType = 'all' | 'movie' | 'show';
type SortType = 'default' | 'title-asc' | 'title-desc' | 'year-desc' | 'year-asc';

const Home = () => {
    // const {idToken, idTokenPayload} = useOidcIdToken(); // this is how you get the users id token
    // const {login, logout, isAuthenticated} = useOidc(); // this gets the functions to login and logout and the logout state
    // const {accessTokenPayload} = useOidcAccessToken(); // this contains the user info in raw json format
    // const userInfo = accessTokenPayload as UserInfo;
  const [servers, setServers] = useState<Server[]>([]);
  const [libraries, setLibraries] = useState<Record<string, Library[]>>({});
  const [openServerId, setOpenServerId] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<GroupedResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('default');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
    //const {fetch} = useOidcFetch();
  const apiFetch = useApiFetch();

  useEffect(() => {
    const savedResults = sessionStorage.getItem('lastSearchResults');
    const savedQuery = sessionStorage.getItem('lastSearchQuery');
    if (savedResults && savedQuery) {
      setAllResults(JSON.parse(savedResults));
      setQuery(savedQuery);
      setHasSearched(true);
    }
    const fetchServers = async () => {
      try {
        const response = await apiFetch('/api/servers');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        setServers(await response.json() as Server[]);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "An error occurred fetching servers");
      }
    };
    fetchServers();
  }, [apiFetch]);

  const displayedResults = useMemo(() => {
    return [...allResults]
      .filter(item => {
        if (filterType === 'all') return true;
        return item.itemType === filterType;
      })
      .sort((a, b) => {
        switch (sortType) {
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          case 'year-desc':
            return (b.year ?? 0) - (a.year ?? 0);
          case 'year-asc':
            return (a.year ?? 0) - (b.year ?? 0);
          default:
            return 0;
        }
      });
  }, [allResults, filterType, sortType]);


  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAllResults([]);
    setHasSearched(true);
    try {
      const response = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json() as SearchResult[];
      const grouped = new Map<string, GroupedResult>();
      for (const item of data) {
        if (!item.guid) continue;
        if (grouped.has(item.guid)) {
          grouped.get(item.guid)!.servers.push({ id: item.serverId, name: item.serverName });
        } else {
          const { serverId, serverName, itemType, ...rest } = item;
          grouped.set(item.guid, { ...rest, itemType, servers: [{ id: serverId, name: serverName }] });
        }
      }
      const finalResults = Array.from(grouped.values());
      setAllResults(finalResults);
      sessionStorage.setItem('lastSearchResults', JSON.stringify(finalResults));
      sessionStorage.setItem('lastSearchQuery', query);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const toggleServerLibraries = (serverId: string) => {
    const newOpenId = openServerId === serverId ? null : serverId;
    setOpenServerId(newOpenId);
    
    if (newOpenId && !libraries[newOpenId]) {
        const fetchLibraries = async () => {
            const response = await apiFetch(`/api/servers/${newOpenId}/libraries`);
            const data = await response.json();
            setLibraries(prev => ({ ...prev, [newOpenId]: data }));
        };
        fetchLibraries();
    }
  };

  return (
    <div className="container">
      <div className="jumbotron">
        <form onSubmit={handleSearch} className="form-inline">
          <input
            type="text"
            className="form-control form-control-lg mr-sm-2 flex-grow-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for a movie or show..."
          />
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      <div className="row">
        <div className="col-lg-3">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Browse Servers</h5>
            </div>
            <ListGroup flush>
              {servers.map((server) => (
                <div key={server.id}>
                  <ListGroupItem
                    action
                    tag="button"
                    onClick={() => toggleServerLibraries(server.id)}
                    disabled={!server.isOnline}
                    className="d-flex align-items-center justify-content-between w-100"
                  >
                    <div className="d-flex align-items-center">
                      <div className={`status-circle ${server.isOnline ? 'bg-success' : 'bg-danger'}`} />
                      {server.name}
                    </div>
                    {server.isOnline && <span className={`caret ${openServerId === server.id ? 'open' : ''}`} />}
                  </ListGroupItem>
                  <Collapse isOpen={openServerId === server.id}>
                    <div className="library-list">
                      {(libraries[server.id] || []).map(lib => (
                        <ListGroupItem action tag={Link} to={`/servers/${server.id}/libraries/${lib.key}/${encodeURIComponent(server.name)}/${encodeURIComponent(lib.title)}`} key={lib.key}>
                            {lib.title}
                        </ListGroupItem>
                      ))}
                      {openServerId === server.id && libraries[server.id]?.length === 0 && (
                          <ListGroupItem className="text-muted small">No libraries found.</ListGroupItem>
                      )}
                    </div>
                  </Collapse>
                </div>
              ))}
            </ListGroup>
          </div>
        </div>

        <div className="col-lg-9">
          {hasSearched && !loading && allResults.length > 0 && (
            <div className="card mb-4">
                <div className="card-body d-flex align-items-center flex-wrap" style={{gap: '1.5rem'}}>
                    <div className="form-group mb-0">
                        <label className="mr-2 mb-0">Filter by:</label>
                        <div className="btn-group btn-group-sm">
                            <button className={`btn btn-outline-primary ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>All</button>
                            <button className={`btn btn-outline-primary ${filterType === 'movie' ? 'active' : ''}`} onClick={() => setFilterType('movie')}>Movies</button>
                            <button className={`btn btn-outline-primary ${filterType === 'show' ? 'active' : ''}`} onClick={() => setFilterType('show')}>Shows</button>
                        </div>
                    </div>
                    <div className="form-group mb-0">
                        <label htmlFor="sort-select" className="mr-2 mb-0">Sort by:</label>
                        <select id="sort-select" className="custom-select custom-select-sm" style={{width: 'auto'}} value={sortType} onChange={e => setSortType(e.target.value as SortType)}>
                            <option value="default">Default</option>
                            <option value="title-asc">Title (A-Z)</option>
                            <option value="title-desc">Title (Z-A)</option>
                            <option value="year-desc">Year (Newest)</option>
                            <option value="year-asc">Year (Oldest)</option>
                        </select>
                    </div>
                </div>
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          <div className="results-grid">
            {loading ? (
              Array.from({ length: 12 }).map((_, index) => <ResultCardSkeleton key={index} />)
            ) : (
              displayedResults.map((item) => (
                <Link to={`/media/${encodeURIComponent(item.guid)}`} key={item.guid} className="result-link">
                  <ResultCard item={item} />
                </Link>
              ))
            )}
          </div>

          {!loading && hasSearched && displayedResults.length === 0 && (
            <div className="text-center mt-5">
              <h4>No results found for "{query}"</h4>
              <p className="text-muted">Try a different search term or browse the libraries on the left.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;

