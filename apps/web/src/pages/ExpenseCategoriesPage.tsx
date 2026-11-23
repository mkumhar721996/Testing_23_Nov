import { useCallback, useEffect, useState } from 'react';
import { ApiError, addCategory, listCategories, renameCategory, retireCategory } from '../api/expenseCategories';
import type { Category } from '../api/expenseCategories';
import { CategoryModal } from '../components/CategoryModal';
import { Icon } from '../components/Icon';
import { RetireModal } from '../components/RetireModal';

type Dialog = { kind: 'add' } | { kind: 'rename'; category: Category } | { kind: 'retire'; category: Category } | null;
type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; categories: Category[]; canManage: boolean };

export function ExpenseCategoriesPage() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [flash, setFlash] = useState('');
  const [refused, setRefused] = useState(false);
  const [failed, setFailed] = useState(false);

  const fetchCategories = useCallback(() => {
    setLoad({ status: 'loading' });
    listCategories().then(
      (res) => setLoad({ status: 'ready', ...res }),
      () => setLoad({ status: 'error' }),
    );
  }, []);
  useEffect(fetchCategories, [fetchCategories]);

  const categories = load.status === 'ready' ? load.categories : [];
  const canManage = load.status === 'ready' && load.canManage;

  /** Runs a write; a 403 closes the dialog and reports the refusal, any other failure goes back to the dialog. */
  async function write(change: () => Promise<Category>, apply: (c: Category) => Category[], message: (c: Category) => string) {
    setRefused(false);
    setFailed(false);
    try {
      const saved = await change();
      setLoad((l) => (l.status === 'ready' ? { ...l, categories: apply(saved) } : l));
      setFlash(message(saved));
      setDialog(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setRefused(true);
        setFlash('');
        setDialog(null);
      } else {
        throw err;
      }
    }
  }

  const add = (name: string) =>
    write(
      () => addCategory(name),
      (c) => [...categories, c],
      (c) => `Added "${c.name}".`,
    );
  const rename = (id: string, name: string) =>
    write(
      () => renameCategory(id, name),
      (c) => categories.map((x) => (x.id === id ? c : x)),
      (c) => `Renamed to "${c.name}".`,
    );
  const retire = (id: string) =>
    write(
      () => retireCategory(id),
      (c) => categories.map((x) => (x.id === id ? c : x)),
      (c) => `Retired "${c.name}". It is no longer offered for new expenses.`,
    ).catch(() => {
      setFlash('');
      setDialog(null);
      setFailed(true);
    });

  const active = categories.filter((c) => !c.retired).length;
  const addButton = (
    <button className="btn btn-primary" type="button" onClick={() => setDialog({ kind: 'add' })}>
      <Icon name="plus" />
      Add category
    </button>
  );

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <span>Settings</span> / <span aria-current="page">Expense categories</span>
          </nav>
          <h1 className="page-title">Expense categories</h1>
          <p className="text-muted">
            Reports group spending by these categories. Retired categories stay on past expenses but are not offered
            for new ones.
          </p>
        </div>
        {canManage && <div className="page-actions">{addButton}</div>}
      </header>

      <div className="page-body">
        <p className="sr-only" role="status" aria-live="polite">
          {refused ? 'Your change was not saved. Only admins can change expense categories.' : flash}
        </p>

        {load.status === 'loading' && (
          <div aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skel-row" />
            ))}
          </div>
        )}

        {load.status === 'error' && (
          <div className="alert alert-danger" role="alert">
            <div className="stack-sm">
              <strong>We couldn't load the expense categories.</strong>
              <span>Your connection may have dropped. Nothing was changed. Try again in a moment.</span>
            </div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={fetchCategories}>
              Try again
            </button>
          </div>
        )}

        {load.status === 'ready' && (
          <>
            {refused && (
              <div className="alert alert-warning" role="alert">
                <div className="stack-sm">
                  <strong>Your change was not saved.</strong>
                  <span>
                    Only admins can add, rename or retire expense categories. The list below is unchanged. Ask an admin
                    if a category needs updating.
                  </span>
                </div>
              </div>
            )}
            {failed && (
              <div className="alert alert-danger" role="alert">
                <span>We couldn't retire the category. Nothing was changed. Try again in a moment.</span>
              </div>
            )}
            {!canManage && (
              <div className="alert alert-info">
                <span>You're not an admin. You can view the list, but changes need an admin.</span>
              </div>
            )}
            {flash && <div className="alert alert-success">{flash}</div>}

            {categories.length === 0 ? (
              <div className="empty-state">
                <h3>No expense categories yet</h3>
                <p>Add the first category so people can choose it when they record an expense.</p>
                {canManage && addButton}
              </div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="table" aria-label="Expense categories">
                    <thead>
                      <tr>
                        <th scope="col">Category</th>
                        <th scope="col">Status</th>
                        <th scope="col" className="num">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.id} className={c.retired ? 'is-retired' : ''}>
                          <td className="cat-name">{c.name}</td>
                          <td>
                            {c.retired ? (
                              <span className="badge badge-warning">Retired</span>
                            ) : (
                              <span className="badge badge-success">Active</span>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              {c.retired ? (
                                <span className="text-sm text-muted">No changes</span>
                              ) : (
                                canManage && (
                                  <>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      type="button"
                                      aria-label={`Rename ${c.name}`}
                                      onClick={() => setDialog({ kind: 'rename', category: c })}
                                    >
                                      Rename
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-sm"
                                      type="button"
                                      aria-label={`Retire ${c.name}`}
                                      onClick={() => setDialog({ kind: 'retire', category: c })}
                                    >
                                      Retire
                                    </button>
                                  </>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm text-muted">
                  {categories.length} categories, {active} active, {categories.length - active} retired.
                </p>
              </>
            )}
          </>
        )}
      </div>

      {dialog?.kind === 'add' && (
        <CategoryModal
          mode="add"
          otherNames={categories.map((c) => c.name)}
          onSubmit={add}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'rename' && (
        <CategoryModal
          mode="rename"
          initialName={dialog.category.name}
          otherNames={categories.filter((c) => c.id !== dialog.category.id).map((c) => c.name)}
          onSubmit={(name) => rename(dialog.category.id, name)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'retire' && (
        <RetireModal
          category={dialog.category}
          onConfirm={() => retire(dialog.category.id)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
