import { useComingSoonDialog } from '../components/ComingSoonDialog';

const ACTIONS = [
  { id: 'action-transfer', label: 'Transfer money', className: 'btn btn-primary' },
  { id: 'action-pay-bill', label: 'Pay a bill', className: 'btn' },
  { id: 'action-open-savings', label: 'Open a savings pot', className: 'btn' },
];

export default function QuickActions() {
  const { show } = useComingSoonDialog();
  return (
    <section className="stack" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="section-title">
        Quick actions
      </h2>
      <div className="cluster">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className={action.className}
            data-wf-id={action.id}
            onClick={show}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
