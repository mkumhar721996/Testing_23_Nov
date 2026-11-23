import type { Category } from '../api/expenseCategories';

/** A category's name; a retired one stays visible and is tagged so past expenses keep it. */
export function CategoryLabel({ category }: { category: Category }) {
  return (
    <>
      {category.name}
      {category.retired && <> <span className="badge badge-warning">Retired</span></>}
    </>
  );
}
