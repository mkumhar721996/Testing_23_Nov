import { useState } from 'react';
import type { FormEvent } from 'react';
import { updateStartDate } from '../api/onboarding';
import type { RecordDetail } from '../api/onboarding';
import { Modal } from '../shell/Modal';

export function EditStartDateModal({
  recordId,
  startDate: initial,
  onClose,
  onSaved,
}: {
  recordId: string;
  startDate: string;
  onClose: () => void;
  onSaved: (record: RecordDetail) => void;
}) {
  const [startDate, setStartDate] = useState(initial);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!startDate) {
      setError('Enter a start date.');
      return;
    }
    setError('');
    setFailed(false);
    setPending(true);
    try {
      onSaved(await updateStartDate(recordId, startDate));
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <Modal titleId="edit-date-title" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <h2 id="edit-date-title">Edit start date</h2>
        {failed && (
          <div className="alert alert-danger" role="alert">
            We couldn't save this change. Try again.
          </div>
        )}
        <div className="field">
          <label htmlFor="f-start">Start date</label>
          <input
            id="f-start"
            className={`input${error ? ' is-invalid' : ''}`}
            type="date"
            value={startDate}
            aria-describedby={error ? 'f-start-err' : undefined}
            onChange={(e) => setStartDate(e.target.value)}
          />
          {error && <p className="field-error" id="f-start-err" role="alert">{error}</p>}
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
