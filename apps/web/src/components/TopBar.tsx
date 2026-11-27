import { getCurrentUser } from '../auth/session';
import UserMenu from './UserMenu';

export default function TopBar({
  onComingSoon,
  onError,
}: {
  onComingSoon: (featureName: string) => void;
  onError?: (message: string) => void;
}) {
  return (
    <header className="top-bar">
      <button className="btn btn-ghost btn-icon" type="button" aria-label="Menu" title="Menu">
        <svg className="icon" aria-hidden="true">
          <use href="#i-menu" />
        </svg>
      </button>
      <span className="brand">
        <span className="brand-mark" aria-hidden="true">
          P
        </span>
        <span>Product</span>
      </span>
      <div className="top-bar-spacer" />
      <div className="top-actions">
        <button
          className="btn btn-ghost btn-icon"
          type="button"
          aria-label="Notifications"
          title="Notifications"
          onClick={() => onComingSoon('Notifications')}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#i-bell" />
          </svg>
        </button>
        <UserMenu user={getCurrentUser()} onComingSoon={onComingSoon} onError={onError} />
      </div>
    </header>
  );
}
