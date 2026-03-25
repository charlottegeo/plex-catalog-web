import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Collapse, FormGroup, Label, Spinner } from 'reactstrap';
import { SortAscIcon, SortDescIcon } from '../components/icons';
import LibraryResultCard from '../components/LibraryResultCard';
import ResultCardSkeleton from '../components/ResultCardSkeleton';
import { GroupedResult } from '../types';
import { parseItemsArray, useApiFetch } from '../utils/api';
import './Home.css';

type LibraryItem = {
  guid: string;
  title: string;
  year?: number;
  contentRating?: string;
  thumb?: string;
  type: 'movie' | 'show';
  originallyAvailableAt?: string;
  duration?: number;
  ratingKey: string;
};

type SortField = 'title' | 'year' | 'date' | 'duration';
type SortDirection = 'asc' | 'desc';

const LibraryPage = () => {
  const PAGE_SIZE = 50;
  const { serverId, libraryKey, serverName, libraryName } = useParams<{
    serverId: string;
    libraryKey: string;
    serverName: string;
    libraryName: string;
  }>();
  const location = useLocation();

  const [items, setItems] = useState<GroupedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contentRatingFilter, setContentRatingFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const isLoadingMoreRef = useRef(false);
  const loadingRef = useRef(false);

  const apiFetch = useApiFetch();

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const loadMoreItems = useCallback(
    async (initial = false) => {
      if (!serverId || !libraryKey || !serverName) return;
      if (
        !initial &&
        (!hasMoreRef.current || isLoadingMoreRef.current || loadingRef.current)
      )
        return;

      if (initial) setLoading(true);
      else {
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
      }

      try {
        const nextOffset = initial ? 0 : offsetRef.current;
        const response = await apiFetch(
          `/api/servers/${serverId}/libraries/${libraryKey}?limit=${PAGE_SIZE}&offset=${nextOffset}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! Status: ${response.status}`);
        const data = parseItemsArray<LibraryItem>(await response.json());

        const groupedResults = data.map((item) => ({
          guid: item.guid,
          title: item.title,
          year: item.year,
          contentRating: item.contentRating,
          itemType: item.type,
          thumbPath: item.thumb,
          originallyAvailableAt: item.originallyAvailableAt,
          duration: item.duration,
          servers: [
            {
              id: serverId,
              name: decodeURIComponent(serverName),
              ratingKey: item.ratingKey,
            },
          ],
        }));

        setItems((prev) =>
          initial ? groupedResults : [...prev, ...groupedResults]
        );
        const next = nextOffset + PAGE_SIZE;
        offsetRef.current = next;
        const moreAvailable = data.length >= PAGE_SIZE;
        hasMoreRef.current = moreAvailable;
        setHasMore(moreAvailable);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        if (initial) setLoading(false);
        else {
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
        }
      }
    },
    [PAGE_SIZE, apiFetch, libraryKey, serverId, serverName]
  );

  useEffect(() => {
    if (!serverId || !libraryKey || !serverName) return;
    setError(null);
    setItems([]);
    offsetRef.current = 0;
    hasMoreRef.current = true;
    isLoadingMoreRef.current = false;
    setHasMore(true);
    setIsLoadingMore(false);
    void loadMoreItems(true);
  }, [serverId, libraryKey, serverName, loadMoreItems]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first.isIntersecting) return;
        void loadMoreItems(false);
      },
      { rootMargin: '240px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMoreItems]);

  const availableContentRatings = useMemo(() => {
    return [
      ...new Set(
        items
          .map((item) => item.contentRating)
          .filter((rating): rating is string => !!rating)
      ),
    ].sort();
  }, [items]);

  const sortedItems = useMemo(() => {
    return [...items]
      .filter((item) => {
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
  }, [items, contentRatingFilter, sortField, sortDirection]);

  const FilterControls = () => (
    <div className="filter-controls-container p-3">
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
    <div className="container-fluid mt-4">
      <nav aria-label="breadcrumb" className="breadcrumb-container">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link
              to="/"
              onClick={() => {
                sessionStorage.removeItem('lastSearchResults');
                sessionStorage.removeItem('lastSearchQuery');
              }}
            >
              Home
            </Link>
          </li>
          <li className="breadcrumb-item">{decodeURIComponent(serverName!)}</li>
          <li className="breadcrumb-item active">
            {decodeURIComponent(libraryName!)}
          </li>
        </ol>
      </nav>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        {!loading && items.length > 0 && (
          <div className="col-12 col-lg-3 mb-4 library-filters-column">
            <div className="card shadow-sm border-0 sticky-top library-filters-card">
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
          </div>
        )}

        <div className="col-12 col-lg-9">
          {!loading && sortedItems.length > 0 && (
            <div className="results-count-header">
              <p className="text-muted mb-3 mb-lg-0">
                {sortedItems.length}{' '}
                {sortedItems.length === 1 ? 'title' : 'titles'}
              </p>
            </div>
          )}
          <div className="results-grid">
            {loading
              ? Array.from({ length: 18 }).map((_, i) => (
                  <ResultCardSkeleton key={i} />
                ))
              : sortedItems.map((item) => (
                  <Link
                    to={`/media/${item.guid}`}
                    key={item.guid}
                    className="result-link"
                    state={{ fromLibrary: location.pathname }}
                  >
                    <LibraryResultCard item={item} />
                  </Link>
                ))}
          </div>
          <div
            ref={loadMoreRef}
            className="d-flex justify-content-center mt-4 mb-5"
          >
            {isLoadingMore && <Spinner color="primary" />}
            {!isLoadingMore && !hasMore && sortedItems.length > 0 && (
              <span className="text-muted small">End of results</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
