import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listRecords } from '../api/onboarding';
import type { RecordDetail, RecordSummary } from '../api/onboarding';
import { StartOnboardingModal } from './StartOnboardingModal';
import { STATUS, formatDate, initials, useMe } from './status';

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; records: RecordSummary[] };

export function OnboardingListPage() {
  const me = useMe();
  const navigate = useNavigate();
  const canStart = me.role === 'administrator';
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [query, setQuery] = useState('');
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchRecords = useCallback(() => {
    setLoad({ state: 'loading' });
    listRecords().then(
      (records) => setLoad({ state: 'ready', records }),
      () => setLoad({ state: 'error' }),
    );
  }, []);

  useEffect(fetchRecords, [fetchRecords]);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function started(record: RecordDetail) {
    setLoad((prev) => ({
      state: 'ready',
      records: [...(prev.state === 'ready' ? prev.records : []), record],
    }));
    setStarting(false);
    setToast(`Onboarding started for ${record.employee.displayName}`);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4000);
  }

  const startButton = (
    <button className="btn btn-primary" type="button" onClick={() => setStarting(true)}>
      <svg className="icon" aria-hidden="true"><use href="#i-plus" /></svg> Start onboarding
    </button>
  );

  const needle = query.trim().toLowerCase();
  const visible =
    load.state === 'ready'
      ? load.records.filter(
          (r) =>
            r.employee.displayName.toLowerCase().includes(needle) ||
            r.employee.jobTitle.toLowerCase().includes(needle),
        )
      : [];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Onboarding</h1>
          <p className="text-muted">New hires starting soon and how far each plan has got.</p>
        </div>
        {canStart && <div className="page-actions">{startButton}</div>}
      </div>

      <div className="page-body">
        {load.state === 'loading' && (
          <div>
            {[0, 1, 2, 3].map((n) => (
              <div key={n} className="skeleton skel-row" />
            ))}
          </div>
        )}

        {load.state === 'error' && (
          <div className="alert alert-danger" role="alert">
            <div>
              <strong>We couldn't load onboardings.</strong> Check your connection and try again.
              <div style={{ marginTop: 'var(--space-1)' }}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={fetchRecords}>
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {load.state === 'ready' && load.records.length === 0 && (
          <div className="empty-state">
            <h2>Start your first onboarding</h2>
            <p>Onboardings for new hires will show up here, with their tasks and progress.</p>
            {canStart && startButton}
          </div>
        )}

        {load.state === 'ready' && load.records.length > 0 && (
          <div>
            <div className="toolbar">
              <input
                className="input"
                type="search"
                aria-label="Search new hires"
                placeholder="Search by name or job title"
                style={{ maxWidth: 'var(--container-sm)' }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="toolbar-spacer" />
              <span className="text-muted text-sm" role="status">
                {visible.length} new {visible.length === 1 ? 'hire' : 'hires'}
              </span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">New hire</th>
                    <th scope="col">Team</th>
                    <th scope="col">Start date</th>
                    <th scope="col">Progress</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r.id}
                      className="hire-row"
                      tabIndex={0}
                      onClick={() => navigate(`/onboarding/${r.id}`)}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/onboarding/${r.id}`)}
                    >
                      <td>
                        <div className="hire-name">
                          <span className="avatar" aria-hidden="true">{initials(r.employee.displayName)}</span>
                          <div>
                            <div>{r.employee.displayName}</div>
                            <div className="text-muted text-sm">{r.employee.jobTitle}</div>
                          </div>
                        </div>
                      </td>
                      <td>{r.employee.team}</td>
                      <td>{formatDate(r.startDate)}</td>
                      <td>
                        <div className="prog-cell">
                          <progress
                            className="progress"
                            value={r.doneCount}
                            max={Math.max(r.totalCount, 1)}
                            aria-label={`${r.employee.displayName} progress`}
                          />
                          <span className="text-sm">{r.doneCount}/{r.totalCount}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS[r.status].badge}`}>{STATUS[r.status].label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {starting && <StartOnboardingModal onClose={() => setStarting(false)} onStarted={started} />}
      {toast && (
        <div className="toast" data-toast role="status">
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
