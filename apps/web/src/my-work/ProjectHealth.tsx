import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import EmptyWorkState from './EmptyWorkState';
import { useProjectHealth } from './useProjectHealth';
import type { CountEntry, ProjectHealth as Health } from './types';

// The API keeps the stored value; the screen shows it in sentence case.
const STATUS_LABELS: Record<string, string> = { 'In Progress': 'In progress' };

const hint = (health: Health, name: string) => {
  switch (health.selectionReason) {
    case 'last-viewed':
      return `Showing ${name}, the project you last viewed.`;
    case 'first-visit':
      return `Showing ${name}, the first of your projects. Your choice is remembered next time.`;
    case 'fallback':
      return `You no longer have a role in the project you last viewed, so ${name} is shown instead.`;
    case 'picked':
      return `Showing ${name}. Your choice is remembered next time.`;
    default:
      return null;
  }
};

function Switcher({
  health,
  onSelect,
}: {
  health: Health;
  onSelect: (projectId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const selected = health.projects.find((p) => p.id === health.selectedProjectId);

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      toggle.current?.focus();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const options = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
      const at = options.indexOf(document.activeElement as HTMLElement);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      options[(at + step + options.length) % options.length]?.focus();
    }
  };

  return (
    <div className="dropdown" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={toggle}
        className="btn btn-secondary"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Project"
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="icon" aria-hidden="true">
          <use href="#i-kanban" />
        </svg>
        {selected?.name}
      </button>
      {open && (
        <ul className="dropdown-menu" role="listbox" aria-label="Your projects">
          {health.projects.map((p) => (
            <li key={p.id} role="presentation">
              <button
                className="dropdown-item"
                type="button"
                role="option"
                aria-checked={p.id === health.selectedProjectId}
                aria-selected={p.id === health.selectedProjectId}
                onClick={() => {
                  setOpen(false);
                  if (p.id !== health.selectedProjectId) onSelect(p.id);
                  toggle.current?.focus();
                }}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CountGroup({
  title,
  entries,
  columns,
  labels = {},
}: {
  title: string;
  entries: CountEntry[];
  columns: string;
  labels?: Record<string, string>;
}) {
  return (
    <div className="health-group">
      <h2 className="text-xl" id={`health-${columns}`}>
        {title}
      </h2>
      <div className={`grid ${columns}`} role="group" aria-labelledby={`health-${columns}`}>
        {entries.map(({ name, count }) => (
          <div key={name} className="card stat-card">
            <div className="stat">
              <span className="stat-label">{labels[name] ?? name}</span>
              <span className="stat-value">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadingCounts() {
  return (
    <div className="health-group" aria-busy="true">
      <div className="grid grid-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card stat-card">
            <span className="skeleton health-skeleton" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProjectHealth() {
  const { state, select, retry } = useProjectHealth();
  // Keep the switcher on screen while the counts reload after a pick.
  const last = useRef<Health | undefined>(undefined);
  if (state.status === 'ready') last.current = state.data;
  const health = state.status === 'ready' ? state.data : last.current;
  const selected = health?.projects.find((p) => p.id === health.selectedProjectId);

  return (
    <section className="stack" aria-label="Project health">
      <h2 className="text-xl">Project health</h2>
      {health && health.projects.length > 0 && (
        <div className="health-bar">
          <Switcher health={health} onSelect={select} />
          {state.status === 'ready' && selected && (
            <span className="health-hint">{hint(health, selected.name)}</span>
          )}
        </div>
      )}
      <div aria-live="polite">
        {state.status === 'loading' && <LoadingCounts />}
        {state.status === 'error' && (
          <div className="alert alert-danger" role="alert">
            <svg className="icon" aria-hidden="true">
              <use href="#i-flag" />
            </svg>
            <div className="stack-sm dash-alert-text">
              <strong>We couldn't load the project's defect counts</strong>
              <span>Your defects are safe. Check your connection and try again.</span>
            </div>
            <button className="btn btn-secondary" type="button" onClick={retry}>
              Try again
            </button>
          </div>
        )}
        {state.status === 'ready' &&
          (state.data.total === 0 ? (
            <EmptyWorkState message="Defects logged in this project will be counted here by status and severity. Create the first one to get started." />
          ) : (
            <>
              <CountGroup
                title="Defects by status"
                entries={state.data.byStatus}
                columns="grid-3"
                labels={STATUS_LABELS}
              />
              <CountGroup
                title="Defects by severity"
                entries={state.data.bySeverity}
                columns="grid-4"
              />
            </>
          ))}
      </div>
    </section>
  );
}
