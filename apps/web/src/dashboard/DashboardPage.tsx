import { useState } from 'react';
import ComingSoonToast, { useComingSoon } from '../components/ComingSoonToast';
import TopBar from '../components/TopBar';
import SearchResults from '../search/SearchResults';
import { useSearch } from '../search/useSearch';
import './dashboard.css';
import StatTiles from './StatTiles';

export default function DashboardPage() {
  const comingSoon = useComingSoon();
  const search = useSearch();
  const [clearSignal, setClearSignal] = useState(0);

  function clearSearch() {
    search.clear();
    setClearSignal((n) => n + 1);
  }

  return (
    <>
      <TopBar onSearch={search.run} searching={search.status === 'searching'} clearSignal={clearSignal} />
      <main className="dashboard-content">
        <div className="page" data-layout="dashboard">
          <div className="page-header">
            <div className="page-title">
              <h1 className="text-3xl">Dashboard</h1>
            </div>
          </div>
          <div className="page-body">
            {search.status === 'idle' ? (
              <StatTiles />
            ) : (
              <SearchResults
                status={search.status}
                query={search.query}
                results={search.results}
                onClear={clearSearch}
                onRetry={search.retry}
                onOpen={comingSoon.show}
              />
            )}
          </div>
        </div>
      </main>
      <ComingSoonToast message={comingSoon.message} onDismiss={comingSoon.dismiss} />
    </>
  );
}
