import { fetchMessages } from './dashboard-api';
import { useWidgetData } from './useWidgetData';
import WidgetError from './WidgetError';

export default function Messages({ onComingSoon }: { onComingSoon: (featureName: string) => void }) {
  const { status, data, retry } = useWidgetData(fetchMessages, []);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Messages</h2>
        <button
          className="btn btn-ghost btn-icon"
          type="button"
          aria-label="Message options"
          onClick={() => onComingSoon('Message options')}
        >
          …
        </button>
      </div>
      {status === 'loading' && (
        <div aria-busy="true">
          {[0, 1].map((i) => (
            <div className="sk-row" key={i}>
              <span className="skeleton sk-av" />
              <span className="skeleton" />
            </div>
          ))}
        </div>
      )}
      {status === 'error' && (
        <WidgetError
          title="We couldn't load your messages."
          hint="Check your connection and try again."
          onRetry={retry}
        />
      )}
      {status === 'empty' && (
        <p className="hint">You're all caught up. New messages from hotels and partners will show here.</p>
      )}
      {status === 'ready' &&
        data.map((message) => (
          <div className="msg" key={message.id}>
            <span className="avatar" aria-hidden="true">
              {message.initials}
            </span>
            <div className="msg-body">
              <strong>{message.from}</strong>
              <span className="truncate">{message.preview}</span>
            </div>
            {message.unread > 0 && (
              <span className="badge badge-primary" aria-label={`${message.unread} unread`}>
                {message.unread}
              </span>
            )}
          </div>
        ))}
    </div>
  );
}
