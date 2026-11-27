import { useState, type FormEvent } from 'react';
import ComingSoonToast, { useComingSoon } from '../components/ComingSoonToast';
import type { ProjectSummary } from '../my-work/types';
import '../dashboard/dashboard.css';

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'];

export default function CreateDefectPage({ projects }: { projects: ProjectSummary[] }) {
  const [titleMissing, setTitleMissing] = useState(false);
  const comingSoon = useComingSoon();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = new FormData(event.currentTarget).get('title') as string;
    setTitleMissing(title.trim() === '');
    // Persisting a defect belongs to another story.
    if (title.trim() !== '') comingSoon.show('Creating defects');
  }

  return (
    <main className="dashboard-content">
      <div className="page" data-layout="form">
        <header className="page-header">
          <h1 className="page-title">Create defect</h1>
        </header>
        <div className="page-body">
          <form className="form-page" noValidate onSubmit={submit}>
            <div className="form-section stack">
              <div className="field">
                <label htmlFor="c-title">Title</label>
                <input
                  className={`input${titleMissing ? ' is-invalid' : ''}`}
                  id="c-title"
                  name="title"
                  type="text"
                  autoComplete="off"
                  aria-invalid={titleMissing}
                  aria-describedby={titleMissing ? 'c-title-err' : undefined}
                />
                {titleMissing && (
                  <span className="field-error" id="c-title-err" role="alert">
                    Enter a title so others can recognise this defect.
                  </span>
                )}
              </div>
              <div className="field">
                <label htmlFor="c-project">Project</label>
                <select className="select" id="c-project" name="project">
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-sev">Severity</label>
                <select className="select" id="c-sev" name="severity" defaultValue="Medium">
                  {SEVERITIES.map((severity) => (
                    <option key={severity}>{severity}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="c-desc">Description</label>
                <textarea
                  className="textarea"
                  id="c-desc"
                  name="description"
                  aria-describedby="c-desc-hint"
                />
                <span className="field-hint" id="c-desc-hint">
                  What happened, and what you expected instead.
                </span>
              </div>
            </div>
            <div className="form-actions">
              <a className="btn btn-secondary" href="#/">
                Cancel
              </a>
              <button className="btn btn-primary" type="submit">
                Create defect
              </button>
            </div>
          </form>
        </div>
      </div>
      <ComingSoonToast message={comingSoon.message} onDismiss={comingSoon.dismiss} />
    </main>
  );
}
