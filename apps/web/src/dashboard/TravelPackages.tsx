import { useState } from 'react';
import { fetchTravelPackages } from './dashboard-api';
import type { PackageSort } from './types';
import { useWidgetData } from './useWidgetData';
import WidgetError from './WidgetError';

const SORTS: { id: PackageSort; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'most-booked', label: 'Most booked' },
];

export default function TravelPackages({ onComingSoon }: { onComingSoon: (featureName: string) => void }) {
  const [sort, setSort] = useState<PackageSort>('latest');
  const { status, data, retry } = useWidgetData((signal) => fetchTravelPackages(sort, signal), [sort]);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Travel packages</h2>
        <div className="sort">
          <label className="text-sm text-muted" htmlFor="pkg-sort">
            Sort by
          </label>
          <select
            className="input sel"
            id="pkg-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as PackageSort)}
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={() => onComingSoon('Travel packages')}>
            View all
          </button>
        </div>
      </div>
      {status === 'loading' && (
        <div className="pkg-grid" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <span className="skeleton sk-ph" key={i} />
          ))}
        </div>
      )}
      {status === 'error' && (
        <WidgetError
          title="We couldn't load travel packages."
          hint="The Operations API didn't respond. Try again in a moment."
          onRetry={retry}
        />
      )}
      {status === 'empty' && (
        <div className="empty-state">
          <h3 style={{ margin: 0 }}>No travel packages yet</h3>
          <p style={{ margin: 0 }}>Packages you offer will show here, newest first.</p>
        </div>
      )}
      {status === 'ready' && (
        <div className="pkg-grid">
          {data.map((pkg) => (
            <div className="ph" role="img" aria-label={`Package image: ${pkg.destination.split(',')[0]}`} key={pkg.id}>
              {pkg.destination}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
