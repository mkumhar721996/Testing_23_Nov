import { ComingSoon } from './ComingSoon';
import type { ProductSummary } from './types';

// Deferred actions per product kind; ids are stable, labels are display only.
const actions: Record<ProductSummary['kind'], { id: string; label: string }[]> = {
  savings: [],
  'fixed-deposit': [{ id: 'manage-deposit', label: 'Manage deposit' }],
  nps: [{ id: 'contribute', label: 'Contribute' }],
  'debit-card': [
    { id: 'freeze-card', label: 'Freeze card' },
    { id: 'set-limits', label: 'Set limits' },
  ],
  'credit-card': [{ id: 'pay-card-bill', label: 'Pay card bill' }],
  'home-loan': [{ id: 'repayment-schedule', label: 'View repayment schedule' }],
};

function ProductCard({ product }: { product: ProductSummary }) {
  const buttons = actions[product.kind].map((a) => (
    <ComingSoon key={a.id} variant="secondary">
      {a.label}
    </ComingSoon>
  ));
  return (
    <div className="card product">
      <h3>
        {product.title}
        {product.status && <span className="badge badge-success"> {product.status}</span>}
      </h3>
      {product.details.map((line) => (
        <p className="note" key={line}>
          {line}
        </p>
      ))}
      {product.progress && (
        <div
          className="progress"
          style={{ '--progress': `${product.progress.percent}%` } as React.CSSProperties}
          role="progressbar"
          aria-label={product.progress.label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={product.progress.percent}
        >
          <span></span>
        </div>
      )}
      {buttons.length > 1 ? <div className="card-actions">{buttons}</div> : buttons}
    </div>
  );
}

function ProductSection({
  label,
  products,
  children,
}: {
  label: string;
  products: ProductSummary[];
  children?: React.ReactNode;
}) {
  if (products.length === 0) return null;
  return (
    <section className="grid grid-3" aria-label={label}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
      {children}
    </section>
  );
}

export const SavingsSection = ({ products }: { products: ProductSummary[] }) => (
  <ProductSection label="Savings" products={products} />
);

export const CardsSection = ({ products }: { products: ProductSummary[] }) => (
  <ProductSection label="Cards" products={products} />
);

export const LoansSection = ({ products }: { products: ProductSummary[] }) => (
  <ProductSection label="Loans" products={products}>
    <div className="card product">
      <h3>Loan prepayment</h3>
      <p className="note">Prepay part of your loan to cut tenure or EMI.</p>
      <ComingSoon variant="secondary">Prepay loan</ComingSoon>
    </div>
  </ProductSection>
);
