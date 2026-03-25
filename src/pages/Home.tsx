import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Collapse,
  FormGroup,
  Label,
  Nav,
  NavItem,
  NavLink,
  Spinner,
} from 'reactstrap';
import RequestModal from '../components/RequestModal';
import ResultCard from '../components/ResultCard';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import { FilmReelIcon, SortAscIcon, SortDescIcon } from '../components/icons';
import {
  DiscoverResult,
  GroupedResult,
  SearchResult,
  SystemInfo,
} from '../types';
import { parseItemsArray, searchDiscover, useApiFetch } from '../utils/api';

type FilterType = 'all' | 'movie' | 'show';

type SortField = 'title' | 'year' | 'date' | 'duration';
type SortDirection = 'asc' | 'desc';

const Home = () => {
  const PAGE_SIZE = 30;
  const [query, setQuery] = useState('');
  const [allResults, setAllResults] = useState<GroupedResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [contentRatingFilter, setContentRatingFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [discoverResults, setDiscoverResults] = useState<DiscoverResult[]>([]);
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);
  const [isLoadingMoreLocal, setIsLoadingMoreLocal] = useState(false);
  const [isLoadingMoreDiscover, setIsLoadingMoreDiscover] = useState(false);
  const [hasMoreLocal, setHasMoreLocal] = useState(true);
  const [hasMoreDiscover, setHasMoreDiscover] = useState(true);
  const [requestModalItem, setRequestModalItem] =
    useState<DiscoverResult | null>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'discover'>('local');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const localOffsetRef = useRef(0);
  const discoverOffsetRef = useRef(0);
  const hasMoreLocalRef = useRef(true);
  const hasMoreDiscoverRef = useRef(true);
  const isLoadingMoreLocalRef = useRef(false);
  const isLoadingMoreDiscoverRef = useRef(false);
  const isDiscoverLoadingRef = useRef(false);
  const apiFetch = useApiFetch();

  useEffect(() => {
    isDiscoverLoadingRef.current = isDiscoverLoading;
  }, [isDiscoverLoading]);

  const roundedTotal = systemInfo
    ? Math.floor((systemInfo.totalMovies + systemInfo.totalShows) / 100) * 100
    : 0;

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await apiFetch('/api/system/info');
        if (response.ok) {
          const data = (await response.json()) as SystemInfo;
          setSystemInfo(data);
        }
      } catch (e) {
        console.error('Failed to fetch system info:', e);
      }
    };
    fetchSystemInfo();
  }, [apiFetch]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const isInput =
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        (el as HTMLElement)?.getAttribute?.('contenteditable') === 'true';
      if (isInput) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key.length === 1 && !e.repeat) {
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const savedResults = sessionStorage.getItem('lastSearchResults');
    const savedQuery = sessionStorage.getItem('lastSearchQuery');
    if (savedResults && savedQuery) {
      setAllResults(JSON.parse(savedResults));
      setQuery(savedQuery);
      setHasSearched(true);
    }
  }, []);

  const displayedResults = useMemo(() => {
    return [...allResults]
      .filter((item) => {
        if (filterType !== 'all' && item.itemType !== filterType) {
          return false;
        }
        if (
          contentRatingFilter !== 'all' &&
          item.contentRating !== contentRatingFilter
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let result = 0;
        switch (sortField) {
          case 'title':
            result = a.title.localeCompare(b.title);
            break;
          case 'year':
            result = (a.year ?? 0) - (b.year ?? 0);
            break;
          case 'date': {
            const aDate = a.originallyAvailableAt || `${a.year}-01-01`;
            const bDate = b.originallyAvailableAt || `${b.year}-01-01`;
            result = aDate.localeCompare(bDate);
            break;
          }
          case 'duration':
            result = (a.duration ?? 0) - (b.duration ?? 0);
            break;
        }

        return sortDirection === 'asc' ? result : -result;
      });
  }, [allResults, filterType, contentRatingFilter, sortField, sortDirection]);

  const localGuids = useMemo(() => {
    const guids = new Set<string>();
    allResults.forEach((r) => {
      if (r.guid) {
        const parts = r.guid.split('/');
        guids.add(parts[parts.length - 1]);
      }
    });
    return guids;
  }, [allResults]);

  const filteredDiscoverResults = useMemo(() => {
    return discoverResults
      .filter((d) => {
        if (filterType !== 'all' && d.type !== filterType) return false;
        if (contentRatingFilter !== 'all') {
          if (d.contentRating !== contentRatingFilter) return false;
        }
        return true;
      })
      .filter((d) => {
        const guid = (d as { guid?: string }).guid || '';
        const parts = guid.split('/');
        const dGuidId = parts[parts.length - 1];
        return !localGuids.has(dGuidId) && !localGuids.has(d.ratingKey);
      });
  }, [discoverResults, localGuids, filterType, contentRatingFilter]);

  const sortedFilteredDiscoverResults = useMemo(() => {
    return [...filteredDiscoverResults].sort((a, b) => {
      let result = 0;
      switch (sortField) {
        case 'title':
          result = a.title.localeCompare(b.title);
          break;
        case 'year':
          result = (a.year ?? 0) - (b.year ?? 0);
          break;
        case 'date': {
          const aDate = a.originallyAvailableAt || `${a.year ?? 0}-01-01`;
          const bDate = b.originallyAvailableAt || `${b.year ?? 0}-01-01`;
          result = aDate.localeCompare(bDate);
          break;
        }
        case 'duration':
          result = (a.duration ?? 0) - (b.duration ?? 0);
          break;
      }
      return sortDirection === 'asc' ? result : -result;
    });
  }, [filteredDiscoverResults, sortField, sortDirection]);

  const availableContentRatings = useMemo(() => {
    const localRatings = allResults
      .map((item) => item.contentRating)
      .filter((rating): rating is string => !!rating);
    const discoverRatings = discoverResults
      .map((d) => d.contentRating)
      .filter((rating): rating is string => !!rating);
    return [...new Set([...localRatings, ...discoverRatings])].sort();
  }, [allResults, discoverResults]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  const mergeSearchResults = useCallback(
    (existing: GroupedResult[], incoming: SearchResult[]): GroupedResult[] => {
      const items = Array.isArray(incoming) ? incoming : [];
      const grouped = new Map(existing.map((item) => [item.guid, item]));
      for (const item of items) {
        if (!item.guid) continue;
        if (grouped.has(item.guid)) {
          const existingItem = grouped.get(item.guid)!;
          const serverExists = existingItem.servers.some(
            (s: { id: string }) => s.id === item.serverId
          );
          if (!serverExists) {
            existingItem.servers.push({
              id: item.serverId,
              name: item.serverName,
              ratingKey: item.ratingKey,
            });
          }
        } else {
          const { serverId, serverName, ratingKey, itemType, ...rest } = item;
          grouped.set(item.guid, {
            ...rest,
            itemType,
            servers: [{ id: serverId, name: serverName, ratingKey }],
          });
        }
      }
      return Array.from(grouped.values());
    },
    []
  );

  const loadMoreLocal = useCallback(
    async (initial = false) => {
      if (!debouncedQuery.trim()) return;
      if (
        !initial &&
        (!hasMoreLocalRef.current || isLoadingMoreLocalRef.current || loading)
      )
        return;
      if (initial) setLoading(true);
      else {
        isLoadingMoreLocalRef.current = true;
        setIsLoadingMoreLocal(true);
      }

      try {
        const nextOffset = initial ? 0 : localOffsetRef.current;
        const response = await apiFetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=${PAGE_SIZE}&offset=${nextOffset}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const data = parseItemsArray<SearchResult>(await response.json());

        setAllResults((prev) => {
          const merged = mergeSearchResults(initial ? [] : prev, data);
          sessionStorage.setItem('lastSearchResults', JSON.stringify(merged));
          sessionStorage.setItem('lastSearchQuery', debouncedQuery);
          return merged;
        });
        const next = nextOffset + PAGE_SIZE;
        localOffsetRef.current = next;
        const hasMore = data.length >= PAGE_SIZE;
        hasMoreLocalRef.current = hasMore;
        setHasMoreLocal(hasMore);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        if (initial) setLoading(false);
        else {
          isLoadingMoreLocalRef.current = false;
          setIsLoadingMoreLocal(false);
        }
      }
    },
    [PAGE_SIZE, apiFetch, debouncedQuery, loading, mergeSearchResults]
  );

  const loadMoreDiscover = useCallback(
    async (initial = false) => {
      if (!debouncedQuery.trim()) return;
      if (
        !initial &&
        (!hasMoreDiscoverRef.current ||
          isLoadingMoreDiscoverRef.current ||
          isDiscoverLoadingRef.current)
      )
        return;
      if (initial) setIsDiscoverLoading(true);
      else {
        isLoadingMoreDiscoverRef.current = true;
        setIsLoadingMoreDiscover(true);
      }

      try {
        const nextOffset = initial ? 0 : discoverOffsetRef.current;
        const data = await searchDiscover(
          apiFetch,
          debouncedQuery,
          PAGE_SIZE,
          nextOffset
        );
        setDiscoverResults((prev) => {
          const combined = initial ? data : [...prev, ...data];
          const deduped = new Map<string, DiscoverResult>();
          combined.forEach((item) => {
            const key = `${(item as { guid?: string }).guid ?? ''}-${item.ratingKey}`;
            deduped.set(key, item);
          });
          return Array.from(deduped.values());
        });
        const next = nextOffset + PAGE_SIZE;
        discoverOffsetRef.current = next;
        const hasMore = data.length >= PAGE_SIZE;
        hasMoreDiscoverRef.current = hasMore;
        setHasMoreDiscover(hasMore);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        if (initial) setIsDiscoverLoading(false);
        else {
          isLoadingMoreDiscoverRef.current = false;
          setIsLoadingMoreDiscover(false);
        }
      }
    },
    [PAGE_SIZE, apiFetch, debouncedQuery]
  );

  useEffect(() => {
    const search = async () => {
      if (!debouncedQuery.trim()) {
        setAllResults([]);
        setDiscoverResults([]);
        localOffsetRef.current = 0;
        discoverOffsetRef.current = 0;
        hasMoreLocalRef.current = true;
        hasMoreDiscoverRef.current = true;
        isLoadingMoreLocalRef.current = false;
        isLoadingMoreDiscoverRef.current = false;
        setHasMoreLocal(true);
        setHasMoreDiscover(true);
        sessionStorage.removeItem('lastSearchResults');
        sessionStorage.removeItem('lastSearchQuery');
        setHasSearched(false);
        return;
      }

      setError(null);
      setHasSearched(true);
      setAllResults([]);
      setDiscoverResults([]);
      localOffsetRef.current = 0;
      discoverOffsetRef.current = 0;
      hasMoreLocalRef.current = true;
      hasMoreDiscoverRef.current = true;
      isLoadingMoreLocalRef.current = false;
      isLoadingMoreDiscoverRef.current = false;
      setHasMoreLocal(true);
      setHasMoreDiscover(true);
      setLoading(true);
      setIsDiscoverLoading(true);

      try {
        const [searchResponse, discoverData] = await Promise.all([
          apiFetch(
            `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=${PAGE_SIZE}&offset=0`
          ),
          searchDiscover(apiFetch, debouncedQuery, PAGE_SIZE, 0),
        ]);
        if (!searchResponse.ok)
          throw new Error(`HTTP error! Status: ${searchResponse.status}`);
        const data = parseItemsArray<SearchResult>(await searchResponse.json());
        const merged = mergeSearchResults([], data);
        setAllResults(merged);
        setDiscoverResults(discoverData);
        localOffsetRef.current = PAGE_SIZE;
        discoverOffsetRef.current = PAGE_SIZE;
        hasMoreLocalRef.current = data.length >= PAGE_SIZE;
        hasMoreDiscoverRef.current = discoverData.length >= PAGE_SIZE;
        setHasMoreLocal(data.length >= PAGE_SIZE);
        setHasMoreDiscover(discoverData.length >= PAGE_SIZE);
        sessionStorage.setItem('lastSearchResults', JSON.stringify(merged));
        sessionStorage.setItem('lastSearchQuery', debouncedQuery);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
        setIsDiscoverLoading(false);
      }
    };

    void search();
  }, [PAGE_SIZE, apiFetch, debouncedQuery, mergeSearchResults]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasSearched) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting) return;
        if (activeTab === 'local') {
          void loadMoreLocal(false);
          return;
        }
        void loadMoreDiscover(false);
      },
      { rootMargin: '240px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, hasSearched, loadMoreDiscover, loadMoreLocal]);

  const FilterControls = () => (
    <div className="filter-controls-container p-3">
      <FormGroup>
        <Label className="small font-weight-bold text-uppercase text-muted">
          Filter Type
        </Label>
        <div className="btn-group btn-group-toggle d-flex w-100">
          {['all', 'movie', 'show'].map((t) => (
            <label
              key={t}
              className={`btn btn-primary flex-grow-1 ${filterType === t ? 'active' : ''}`}
            >
              <input
                type="radio"
                name="filter-type"
                id={`filter-${t}`}
                checked={filterType === t}
                onChange={() => setFilterType(t as FilterType)}
                autoComplete="off"
              />
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </label>
          ))}
        </div>
      </FormGroup>
      {availableContentRatings.length > 0 && (
        <FormGroup>
          <Label className="small font-weight-bold text-uppercase text-muted">
            Content Rating
          </Label>
          <select
            className="form-control"
            value={contentRatingFilter}
            onChange={(e) => setContentRatingFilter(e.target.value)}
          >
            <option value="all">All Ratings</option>
            {availableContentRatings.map((rating) => (
              <option key={rating} value={rating}>
                {rating}
              </option>
            ))}
          </select>
        </FormGroup>
      )}
      <FormGroup className="mb-0">
        <Label className="small font-weight-bold text-uppercase text-muted">
          Sort By
        </Label>
        <div className="d-flex align-items-center">
          <select
            className="form-control flex-grow-1"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <option value="title">Title</option>
            <option value="year">Year</option>
            <option value="date">Release Date</option>
            <option value="duration">Duration</option>
          </select>
          <button
            className="btn btn-secondary ml-2 d-flex align-items-center justify-content-center"
            type="button"
            onClick={() =>
              setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
            }
            style={{ minWidth: '40px', height: '38px' }}
            title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortDirection === 'asc' ? (
              <SortAscIcon style={{ fontSize: '1.2rem' }} />
            ) : (
              <SortDescIcon style={{ fontSize: '1.2rem' }} />
            )}
          </button>
        </div>
      </FormGroup>
    </div>
  );

  return (
    <div className="container mt-4">
      {error && (
        <Alert color="danger" fade={false} toggle={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="row">
        <div className="col-12 col-lg-3 mb-4">
          <div className="search-header mb-3">
            <input
              ref={searchInputRef}
              type="text"
              className="form-control form-control-lg border-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a movie or show..."
            />
          </div>
          {hasSearched && (
            <div
              className="card shadow-sm border-0 sticky-top"
              style={{ top: '20px' }}
            >
              <div
                className="card-header bg-white d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <h5 className="mb-0">Filters</h5>
                <span className={`caret ${filtersOpen ? 'open' : ''}`} />
              </div>
              <Collapse isOpen={filtersOpen}>
                <FilterControls />
              </Collapse>
            </div>
          )}
        </div>

        <div className="col-12 col-lg-9">
          {!hasSearched && (
            <div className="empty-state-section">
              <FilmReelIcon className="empty-state-ghost-icon" />
              <div className="empty-state-content">
                <h2 className="empty-state-headline text-bold">
                  Search through
                </h2>
                <h3 className="empty-state-headline text-muted">
                  {systemInfo ? `${roundedTotal}+ Titles` : '...'}
                </h3>
              </div>
            </div>
          )}
          {hasSearched && debouncedQuery.trim() && (
            <>
              <Nav pills className="mb-3">
                <NavItem>
                  <NavLink
                    className={activeTab === 'local' ? 'active' : ''}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('local');
                    }}
                  >
                    Available Now ({displayedResults.length})
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    className={activeTab === 'discover' ? 'active' : ''}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab('discover');
                    }}
                  >
                    Request New ({filteredDiscoverResults.length})
                  </NavLink>
                </NavItem>
              </Nav>

              {(activeTab === 'local' ? loading : isDiscoverLoading) ? (
                <div className="results-grid">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ResultCardSkeleton key={i} />
                  ))}
                </div>
              ) : activeTab === 'local' ? (
                <>
                  <div className="results-grid">
                    {displayedResults.map((item) => (
                      <Link
                        to={`/media/${item.guid}`}
                        key={item.guid}
                        className="result-link"
                      >
                        <ResultCard
                          item={item}
                          hideTypeTag={filterType !== 'all'}
                        />
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="results-grid">
                  {sortedFilteredDiscoverResults.map((item) => {
                    const plexThumbUrl = item.thumb?.startsWith('/')
                      ? `https://metadata.provider.plex.tv${item.thumb}`
                      : item.thumb;
                    const thumbUrl = plexThumbUrl;
                    return (
                      <div
                        key={item.ratingKey}
                        role="button"
                        tabIndex={0}
                        className="result-link result-link--request"
                        aria-label={`Request ${item.title}`}
                        onClick={() => setRequestModalItem(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setRequestModalItem(item);
                          }
                        }}
                      >
                        <ResultCard
                          item={item}
                          hideTypeTag={filterType !== 'all'}
                          imageUrl={thumbUrl}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div
                ref={loadMoreRef}
                className="d-flex justify-content-center mt-4 mb-5"
              >
                {((activeTab === 'local' && isLoadingMoreLocal) ||
                  (activeTab === 'discover' && isLoadingMoreDiscover)) && (
                  <Spinner color="primary" />
                )}
                {activeTab === 'local' &&
                  !loading &&
                  !isLoadingMoreLocal &&
                  !hasMoreLocal &&
                  displayedResults.length > 0 && (
                    <span className="text-muted small">End of results</span>
                  )}
                {activeTab === 'discover' &&
                  !isDiscoverLoading &&
                  !isLoadingMoreDiscover &&
                  !hasMoreDiscover &&
                  discoverResults.length > 0 && (
                    <span className="text-muted small">End of results</span>
                  )}
              </div>
            </>
          )}
          {hasSearched &&
            !loading &&
            !isDiscoverLoading &&
            displayedResults.length === 0 &&
            filteredDiscoverResults.length === 0 && (
              <div className="empty-state-section title-not-found-section">
                <FilmReelIcon className="empty-state-ghost-icon" />
                <div className="empty-state-content">
                  <h2 className="empty-state-headline">Title Not Found</h2>
                  <p className="empty-state-subtext small text-uppercase text-muted">
                    We couldn&apos;t find any results for &quot;
                    {debouncedQuery}&quot;.
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
      <RequestModal
        isOpen={!!requestModalItem}
        toggle={() => setRequestModalItem(null)}
        item={requestModalItem}
        apiFetch={apiFetch}
      />
    </div>
  );
};

export default Home;
