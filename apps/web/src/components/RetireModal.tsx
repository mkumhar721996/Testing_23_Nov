import { useState } from 'react';
import type { Category } from '../api/expenseCategories';
import { Modal } from './Modal';

export function RetireModal({
  category,
  onConfirm,
  onClose,
}: {
  category: Category;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    await onConfirm(); // the page closes this dialog on success and on a refusal
    setPending(false);
  }

  return (
    <Modal titleId="retire-title" onClose={onClose}>
      <div className="stack">
        <h2 className="text-xl" id="retire-title">
          Retire category?
        </h2>
        <p className="text-muted">
          "{category.name}" stays on past expenses but is no longer offered for new ones.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Keep active
          </button>
          <button className="btn btn-danger" type="button" disabled={pending} onClick={confirm}>
            {pending ? 'Retiring…' : 'Retire category'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
