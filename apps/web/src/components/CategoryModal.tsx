import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/expenseCategories';
import { Modal } from './Modal';

type Props = {
  mode: 'add' | 'rename';
  initialName?: string;
  /** Names of the other categories, for the duplicate check (case-insensitive). */
  otherNames: string[];
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
};

export function CategoryModal({ mode, initialName = '', otherNames, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const isAdd = mode === 'add';

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter a category name.');
    if (otherNames.some((n) => n.toLowerCase() === trimmed.toLowerCase())) {
      return setError(`"${trimmed}" already exists. Choose a different name.`);
    }
    setPending(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      // A refused write (403) is handled by the page, which closes this form; name problems stay here.
      setPending(false);
      setError(err instanceof ApiError ? err.message : "We couldn't save the change. Try again in a moment.");
    }
  }

  return (
    <Modal titleId="cat-modal-title" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <h2 className="text-xl" id="cat-modal-title">
          {isAdd ? 'Add category' : 'Rename category'}
        </h2>
        <div className="field">
          <label htmlFor="cat-input">Category name</label>
          <input
            className="input"
            id="cat-input"
            name="name"
            type="text"
            autoComplete="off"
            value={name}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'cat-hint cat-error' : 'cat-hint'}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
          />
          <span className="field-hint" id="cat-hint">
            Leading and trailing spaces are removed. Names must be unique.
          </span>
          {error && (
            <span className="field-error" id="cat-error" role="alert">
              {error}
            </span>
          )}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? 'Saving…' : isAdd ? 'Add category' : 'Save name'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
