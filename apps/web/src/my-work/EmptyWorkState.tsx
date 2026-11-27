export default function EmptyWorkState({ message }: { message: string }) {
  return (
    <section className="card">
      <div className="empty-state">
        <svg
          className="dash-illus"
          viewBox="0 0 120 90"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="22" y="14" width="76" height="62" rx="8" />
          <path d="M38 34h44M38 46h30" className="soft" stroke="var(--color-border-strong)" />
          <circle cx="84" cy="64" r="14" fill="var(--color-surface)" />
          <path d="M84 58v12M78 64h12" />
        </svg>
        <h3 className="text-2xl">No defects found</h3>
        <p className="empty-guidance">{message}</p>
        <a className="btn btn-primary" href="#/defects/new">
          <svg className="icon" aria-hidden="true">
            <use href="#i-plus" />
          </svg>
          Create defect
        </a>
      </div>
    </section>
  );
}
