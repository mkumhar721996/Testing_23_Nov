import { useState } from 'react';
import type { FormEvent } from 'react';
import { addItem } from '../api/onboarding';
import type { ChecklistItem, Stage } from '../api/onboarding';
import { ApiError } from '../api/client';
import { Modal } from '../shell/Modal';
import { STAGES } from './stages';

export function AddChecklistItemModal({
  recordId,
  onClose,
  onAdded,
}: {
  recordId: string;
  onClose: () => void;
  onAdded: (item: ChecklistItem) => void;
}) {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<Stage>('before_day_one');
  const [ownerName, setOwnerName] = useState('');
  const [titleError, setTitleError] = useState('');
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setTitleError('Enter a title.');
      return;
    }
    setTitleError('');
    setFailed(false);
    setPending(true);
    try {
      onAdded(await addItem(recordId, { stage, title: title.trim(), ownerName: ownerName.trim() }));
    } catch (err) {
      const fieldError = err instanceof ApiError ? err.fields.title : undefined;
      if (fieldError) setTitleError(fieldError);
      else setFailed(true);
      setPending(false);
    }
  }

  return (
    <Modal titleId="add-item-title" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <h2 id="add-item-title">Add checklist item</h2>
        {failed && (
          <div className="alert alert-danger" role="alert">
            We couldn't add this item. Try again.
          </div>
        )}
        <div className="field">
          <label htmlFor="f-title">Title</label>
          <input
            id="f-title"
            className={`input${titleError ? ' is-invalid' : ''}`}
            value={title}
            autoComplete="off"
            aria-describedby={titleError ? 'f-title-err' : undefined}
            onChange={(e) => setTitle(e.target.value)}
          />
          {titleError && <p className="field-error" id="f-title-err" role="alert">{titleError}</p>}
        </div>
        <div className="field">
          <label htmlFor="f-stage">Stage</label>
          <select id="f-stage" className="input" value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-owner">Owner</label>
          <input
            id="f-owner"
            className="input"
            value={ownerName}
            autoComplete="off"
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Adding…' : 'Add item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
