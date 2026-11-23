import OrganizationDetailPanel from './OrganizationDetailPanel';
import OrganizationsTable from './OrganizationsTable';
import { useOrganizations } from './hooks';
import { useSelectedOrganization } from './useSelectedOrganization';
import './organizations.css';

function Skeleton() {
  return (
    <div aria-busy="true" className="stack">
      <div className="skeleton org-skeleton" />
      <div className="skeleton org-skeleton" />
      <div className="skeleton org-skeleton" />
    </div>
  );
}

export default function OrganizationsPage() {
  const { status, data, retry } = useOrganizations();
  const [selectedId, select] = useSelectedOrganization();

  return (
    <div className="page" data-layout="table">
      <header className="page-header">
        <div className="page-title">
          <h1 className="org-title">Organizations</h1>
          <p className="muted">Find an organization and open its details.</p>
        </div>
      </header>
      <div className={selectedId ? 'page-body org-split' : 'page-body'}>
        <div>
          {status === 'loading' && <Skeleton />}
          {(status === 'error' || status === 'forbidden') && (
            <div className="alert alert-danger" role="alert">
              <p>We couldn't load organizations. Your connection may have dropped. Try again in a moment.</p>
              <button type="button" className="btn" onClick={retry}>
                Try again
              </button>
            </div>
          )}
          {status === 'success' && data && data.length === 0 && (
            <div className="empty-state" data-testid="empty-state">
              <h3>No organizations found</h3>
              <p>Organizations you can see will show up here.</p>
            </div>
          )}
          {status === 'success' && data && data.length > 0 && (
            <OrganizationsTable organizations={data} selectedId={selectedId} onViewDetails={select} />
          )}
        </div>
        {selectedId && (
          <OrganizationDetailPanel key={selectedId} organizationId={selectedId} onClose={() => select(null)} />
        )}
      </div>
    </div>
  );
}
