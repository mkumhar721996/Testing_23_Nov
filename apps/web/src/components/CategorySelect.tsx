import { useEffect, useState } from 'react';
import { listCategories } from '../api/expenseCategories';
import type { Category } from '../api/expenseCategories';

/** Offers active categories only, so a retired one cannot be chosen for a new expense. */
export function CategorySelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (categoryId: string) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let current = true;
    listCategories({ activeOnly: true })
      .then((res) => current && setCategories(res.categories))
      .catch(() => current && setCategories([]));
    return () => {
      current = false;
    };
  }, []);

  return (
    <select className="select" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a category</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
