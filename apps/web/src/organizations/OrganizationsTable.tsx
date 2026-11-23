import RowMenu, { type RowMenuAction } from './RowMenu';
import type { OrganizationListItem } from './types';

const VIEW_DETAILS = 'view-details';
const ROW_ACTIONS: RowMenuAction[] = [{ id: VIEW_DETAILS, label: 'View details' }];

interface OrganizationsTableProps {
  organizations: OrganizationListItem[];
  selectedId: string | null;
  onViewDetails: (id: string) => void;
}

export default function OrganizationsTable({ organizations, selectedId, onViewDetails }: OrganizationsTableProps) {
  return (
    <div className="table-wrap">
      <table className="table org-table">
        <caption className="sr-only">Organizations you can see</caption>
        <thead>
          <tr>
            <th scope="col">Organization</th>
            <th scope="col">Address</th>
            <th scope="col">Admin</th>
            <th scope="col">Created By</th>
            <th scope="col" className="col-menu">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {organizations.map((organization) => (
            <tr key={organization.id} className={organization.id === selectedId ? 'is-selected' : undefined}>
              <td>{organization.name}</td>
              <td>{organization.address}</td>
              <td>{organization.admin}</td>
              <td>{organization.createdBy}</td>
              <td className="col-menu">
                <RowMenu
                  rowName={organization.name}
                  actions={ROW_ACTIONS}
                  onSelect={(actionId) => {
                    if (actionId === VIEW_DETAILS) onViewDetails(organization.id);
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
