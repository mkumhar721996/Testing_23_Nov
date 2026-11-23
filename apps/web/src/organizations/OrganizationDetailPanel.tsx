import { useOrganizationDetail } from './hooks';
import type { OrganizationDetail } from './types';

interface OrganizationDetailPanelProps {
  organizationId: string;
  onClose: () => void;
}

function Contact({ value }: { value: string | null }) {
  return value ? <dd>{value}</dd> : <dd className="muted">Not provided</dd>;
}

function ConsultantSection({ consultant }: { consultant: OrganizationDetail['consultant'] }) {
  return (
    <div>
      <h4>Fundraising Consultant</h4>
      {consultant ? (
        <dl>
          <dt>Full name</dt>
          <dd>{consultant.fullName}</dd>
          <dt>Email</dt>
          <Contact value={consultant.email} />
          <dt>Phone</dt>
          <Contact value={consultant.phone} />
        </dl>
      ) : (
        <p className="muted">Unassigned</p>
      )}
    </div>
  );
}

export default function OrganizationDetailPanel({ organizationId, onClose }: OrganizationDetailPanelProps) {
  const { status, data, retry } = useOrganizationDetail(organizationId);

  return (
    <aside className="org-panel" aria-label="Organization details">
      <div className="panel-head">
        <h3>Organization details</h3>
        <button type="button" className="btn btn-ghost btn-icon" aria-label="Close details" onClick={onClose}>
          ×
        </button>
      </div>
      {status === 'loading' && (
        <div aria-busy="true" className="stack">
          <div className="skeleton org-skeleton" />
          <div className="skeleton org-skeleton" />
          <div className="skeleton org-skeleton" />
        </div>
      )}
      {status === 'error' && (
        <div className="alert alert-danger" role="alert">
          <p>We couldn't load these details. Try again in a moment.</p>
          <button type="button" className="btn" onClick={retry}>
            Try again
          </button>
        </div>
      )}
      {status === 'forbidden' && (
        <div className="alert alert-danger" role="alert">
          <p>Access denied. You don't have access to this organization.</p>
        </div>
      )}
      {status === 'success' && data && (
        <>
          <dl>
            <dt>Organization</dt>
            <dd>{data.name}</dd>
            <dt>Address</dt>
            <dd>{data.address}</dd>
            <dt>Admin</dt>
            <dd>{data.admin}</dd>
            <dt>Created By</dt>
            <dd>{data.createdBy}</dd>
          </dl>
          <hr />
          <ConsultantSection consultant={data.consultant} />
          <p className="muted org-note">Read-only. Editing is not available here.</p>
        </>
      )}
    </aside>
  );
}
