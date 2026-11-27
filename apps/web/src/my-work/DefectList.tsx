import DefectRow from './DefectRow';
import type { DefectSummary } from './types';

export default function DefectList({ defects }: { defects: DefectSummary[] }) {
  return (
    <ul className="dash-list">
      {defects.map((defect) => (
        <DefectRow key={defect.id} defect={defect} />
      ))}
    </ul>
  );
}
