import { defectHref } from '../routes';
import { relativeTime } from './relative-time';
import type { DefectSummary } from './types';

const SEVERITY_BADGE: Record<string, string> = {
  Critical: 'badge-danger',
  High: 'badge-warning',
  Medium: 'badge-info',
};

export default function DefectRow({ defect }: { defect: DefectSummary }) {
  return (
    <li>
      <a className="dash-row" href={defectHref(defect.id)}>
        <span className="dash-title">{defect.title}</span>
        <span className="dash-meta">
          <span className="dash-id">{defect.key}</span>
          <span className={`badge ${SEVERITY_BADGE[defect.severity] ?? ''}`}>{defect.severity}</span>
          <span className="badge">{defect.status}</span>
          <span>{defect.projectName}</span>
          {defect.createdByName && <span>{`Created by ${defect.createdByName}`}</span>}
          <span>{`Updated ${relativeTime(defect.updatedAt)}`}</span>
        </span>
      </a>
    </li>
  );
}
