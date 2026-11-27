import ComingSoonToast, { useComingSoon } from '../components/ComingSoonToast';
import SpendingChart from '../dashboard/SpendingChart';
import DefectList from './DefectList';
import EmptyWorkState from './EmptyWorkState';
import { useMyWork } from './useMyWork';
import type { MyWorkResponse } from './types';
import '../dashboard/dashboard.css';

const OPEN_LIST_LIMIT = 10;

function Panels({ data, onSeeAll }: { data: MyWorkResponse; onSeeAll: () => void }) {
  const { openDefects, recentlyUpdated } = data;
  return (
    <div className="grid grid-2" aria-live="polite">
      <section className="card card-flush" aria-labelledby="open-heading">
        <div className="card-header dash-panel-header">
          <h2 className="text-xl" id="open-heading">
            My open defects
          </h2>
          {openDefects.total > 0 && (
            <span className="badge badge-primary">{`${openDefects.total} open`}</span>
          )}
        </div>
        {openDefects.items.length === 0 ? (
          <div className="dash-inline-empty">
            <strong>No defects found</strong>
            Nothing open is assigned to you. Defects assigned to you will appear here.
          </div>
        ) : (
          <DefectList defects={openDefects.items} />
        )}
        {openDefects.total > OPEN_LIST_LIMIT && (
          <div className="dash-note">
            <button className="btn btn-ghost" type="button" onClick={onSeeAll}>
              See all open defects
            </button>
          </div>
        )}
      </section>
      <section className="card card-flush" aria-labelledby="recent-heading">
        <div className="card-header dash-panel-header">
          <h2 className="text-xl" id="recent-heading">
            Recently updated
          </h2>
          <span className="text-sm text-muted">Latest 10 in all your projects</span>
        </div>
        <DefectList defects={recentlyUpdated} />
      </section>
    </div>
  );
}

function LoadingPanels() {
  return (
    <div className="grid grid-2" aria-busy="true">
      {['my open defects', 'recently updated defects'].map((name) => (
        <section key={name} className="card card-flush" aria-label={`Loading ${name}`}>
          <div className="dash-skel">
            <span className="skeleton dash-skel-title" />
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
            <span className="skeleton" />
          </div>
        </section>
      ))}
    </div>
  );
}

export default function MyWorkPage() {
  const { state, retry } = useMyWork();
  const comingSoon = useComingSoon();

  return (
    <main className="dashboard-content">
      <div className="page" data-layout="dashboard">
        <header className="page-header">
          <h1 className="page-title">My work</h1>
          <div className="page-actions">
            <a className="btn btn-primary" href="#/defects/new">
              <svg className="icon" aria-hidden="true">
                <use href="#i-plus" />
              </svg>
              Create defect
            </a>
          </div>
        </header>
        <div className="page-body">
          {state.status === 'loading' && <LoadingPanels />}
          {state.status === 'error' && (
            <div className="alert alert-danger" role="alert">
              <svg className="icon" aria-hidden="true">
                <use href="#i-flag" />
              </svg>
              <div className="stack-sm dash-alert-text">
                <strong>We couldn't load your defects</strong>
                <span>Your work is safe. Check your connection and try again.</span>
              </div>
              <button className="btn btn-secondary" type="button" onClick={retry}>
                Try again
              </button>
            </div>
          )}
          {state.status === 'ready' &&
            (state.data.hasAnyDefects ? (
              <Panels data={state.data} onSeeAll={() => comingSoon.show('All open defects')} />
            ) : (
              <EmptyWorkState />
            ))}
          <SpendingChart />
        </div>
      </div>
      <ComingSoonToast message={comingSoon.message} onDismiss={comingSoon.dismiss} />
    </main>
  );
}
