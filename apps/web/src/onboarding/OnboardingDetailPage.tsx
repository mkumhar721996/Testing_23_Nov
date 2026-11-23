import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getRecord, setItemDone } from '../api/onboarding';
import type { ChecklistItem, RecordDetail } from '../api/onboarding';
import { ApiError } from '../api/client';
import { AddChecklistItemModal } from './AddChecklistItemModal';
import { EditStartDateModal } from './EditStartDateModal';
import { STAGES } from './stages';
import { STATUS, formatDate, useMe } from './status';

type Load =
  | { state: 'loading' }
  | { state: 'forbidden' }
  | { state: 'missing' }
  | { state: 'error' }
  | { state: 'ready'; record: RecordDetail };

type Dialog = 'add-item' | 'edit-date' | null;

function recount(record: RecordDetail, items: ChecklistItem[]): RecordDetail {
  const doneCount = items.filter((i) => i.done).length;
  const status = doneCount === 0 ? 'not_started' : doneCount === items.length ? 'complete' : 'in_progress';
  return { ...record, items, doneCount, totalCount: items.length, status };
}

export function OnboardingDetailPage() {
  const { id = '' } = useParams();
  const me = useMe();
  const isAdmin = me.role === 'administrator';
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [tickFailed, setTickFailed] = useState(false);

  const fetchRecord = useCallback(() => {
    setLoad({ state: 'loading' });
    getRecord(id).then(
      (record) => setLoad({ state: 'ready', record }),
      (err) => {
        const status = err instanceof ApiError ? err.status : 0;
        setLoad({ state: status === 403 ? 'forbidden' : status === 404 ? 'missing' : 'error' });
      },
    );
  }, [id]);

  useEffect(fetchRecord, [fetchRecord]);

  const backLink = (
    <Link to="/onboarding" className="btn btn-secondary btn-sm">Back to onboarding</Link>
  );

  if (load.state === 'loading') {
    return (
      <div className="page">
        <div className="page-body">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className="skeleton skel-row" />
          ))}
        </div>
      </div>
    );
  }

  if (load.state === 'forbidden' || load.state === 'missing') {
    return (
      <div className="page">
        <div className="alert alert-danger" role="alert">
          <div>
            {load.state === 'forbidden'
              ? "You don't have access to this onboarding record."
              : "We couldn't find this onboarding record."}
            <div style={{ marginTop: 'var(--space-1)' }}>{backLink}</div>
          </div>
        </div>
      </div>
    );
  }

  if (load.state === 'error') {
    return (
      <div className="page">
        <div className="alert alert-danger" role="alert">
          <div>
            <strong>We couldn't load this onboarding.</strong> Check your connection and try again.
            <div style={{ marginTop: 'var(--space-1)' }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={fetchRecord}>Try again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { record } = load;
  const percent = record.totalCount === 0 ? 0 : Math.round((record.doneCount / record.totalCount) * 100);

  async function toggle(item: ChecklistItem) {
    setTickFailed(false);
    try {
      const updated = await setItemDone(record.id, item.id, !item.done);
      setLoad((prev) =>
        prev.state === 'ready'
          ? {
              state: 'ready',
              record: recount(prev.record, prev.record.items.map((i) => (i.id === updated.id ? updated : i))),
            }
          : prev,
      );
    } catch {
      setTickFailed(true);
    }
  }

  const addButton = (
    <button className="btn btn-secondary btn-sm" type="button" onClick={() => setDialog('add-item')}>
      <svg className="icon" aria-hidden="true"><use href="#i-plus" /></svg> Add checklist item
    </button>
  );

  return (
    <div className="page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/onboarding">Onboarding</Link> / <span>{record.employee.displayName}</span>
      </nav>
      <div className="page-header">
        <div>
          <h1 className="page-title">{record.employee.displayName}</h1>
          <p className="text-muted">
            {record.employee.jobTitle}, {record.employee.team}. Starts {formatDate(record.startDate)}.
          </p>
        </div>
        <div className="page-actions">
          <span className={`badge ${STATUS[record.status].badge}`}>{STATUS[record.status].label}</span>
          {isAdmin && (
            <button className="btn btn-secondary" type="button" onClick={() => setDialog('edit-date')}>
              Edit start date
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {tickFailed && (
          <div className="alert alert-danger" role="alert">We couldn't save that change. Try again.</div>
        )}
        <div className="detail-grid">
          <div className="stack">
            <div className="card stack-sm">
              <div className="cluster-between">
                <strong>{record.doneCount} of {record.totalCount} tasks done</strong>
                <span className="text-muted text-sm">{percent}%</span>
              </div>
              <progress
                className="progress"
                value={record.doneCount}
                max={Math.max(record.totalCount, 1)}
                aria-label="Onboarding progress"
              />
              {isAdmin && record.items.length > 0 && <div>{addButton}</div>}
            </div>

            {record.items.length === 0 ? (
              <div className="card">
                <div className="empty-state">
                  <p>No items are set yet. Checklist items added by HR will show up here.</p>
                  {isAdmin && addButton}
                </div>
              </div>
            ) : (
              STAGES.map((stage) => {
                const items = record.items.filter((i) => i.stage === stage.id);
                if (items.length === 0) return null;
                return (
                  <section key={stage.id} className="card stack-sm" aria-labelledby={`stage-${stage.id}`}>
                    <h2 className="group-title" id={`stage-${stage.id}`}>{stage.label}</h2>
                    {items.map((item) => (
                      <label key={item.id} className="check-row">
                        <input
                          className="checkbox"
                          type="checkbox"
                          checked={item.done}
                          disabled={!isAdmin}
                          onChange={() => toggle(item)}
                        />
                        <span>{item.title}</span>
                        {item.ownerName && <span className="task-meta text-sm text-muted">{item.ownerName}</span>}
                      </label>
                    ))}
                  </section>
                );
              })
            )}
          </div>

          <aside className="stack">
            <div className="card stack-sm">
              <h2 className="group-title">Details</h2>
              <dl className="facts">
                <dt>Manager</dt>
                <dd>{record.managerName ?? 'Not set'}</dd>
                <dt>Team</dt>
                <dd>{record.employee.team}</dd>
                <dt>Job title</dt>
                <dd>{record.employee.jobTitle}</dd>
              </dl>
            </div>
          </aside>
        </div>
      </div>

      {dialog === 'add-item' && (
        <AddChecklistItemModal
          recordId={record.id}
          onClose={() => setDialog(null)}
          onAdded={(item) => {
            setLoad({ state: 'ready', record: recount(record, [...record.items, item]) });
            setDialog(null);
          }}
        />
      )}
      {dialog === 'edit-date' && (
        <EditStartDateModal
          recordId={record.id}
          startDate={record.startDate}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setLoad({ state: 'ready', record: updated });
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
