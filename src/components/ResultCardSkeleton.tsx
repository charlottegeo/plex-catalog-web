import './ResultCardSkeleton.css';

const ResultCardSkeleton = () => {
  return (
    <div className="card result-card h-100 skeleton-card">
      <div className="skeleton skeleton-poster"></div>
      <div className="card-body p-2 d-flex flex-column">
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text skeleton-text-short"></div>
      </div>
    </div>
  );
};

export default ResultCardSkeleton;