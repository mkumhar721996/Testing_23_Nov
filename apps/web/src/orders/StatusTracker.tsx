import type { OrderStatusView } from './types';

const PROGRESS = [10, 30, 50, 70, 100];

type Props = Pick<OrderStatusView, 'steps' | 'status'>;

export function StatusTracker({ steps, status }: Props) {
  const currentIndex = steps.findIndex((s) => s.key === status);
  return (
    <>
      <ol className="stepper" aria-label="Order progress">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={i < currentIndex ? 'step is-done' : 'step'}
            aria-current={i === currentIndex ? 'step' : undefined}
          >
            {step.label}
          </li>
        ))}
      </ol>
      <div
        className="progress"
        style={{ '--progress': `${PROGRESS[currentIndex] ?? 0}%` } as React.CSSProperties}
        role="progressbar"
        aria-label="Order progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={PROGRESS[currentIndex] ?? 0}
      >
        <span />
      </div>
    </>
  );
}
