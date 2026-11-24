import { useId } from 'react';
import { formatDate, formatMask, formatMoney, formatRate } from './format';
import type { Product } from './types';

function summary(product: Product): { figure: string; note: string } {
  switch (product.type) {
    case 'account':
      return { figure: formatMoney(product.currentBalance), note: 'Current balance' };
    case 'credit_card':
      return {
        figure: formatMoney(product.amountOwed),
        note: `Amount owed · ${formatMoney(product.availableCredit)} available credit`,
      };
    case 'loan':
      return { figure: formatMoney(product.outstandingBalance), note: 'Outstanding balance' };
    case 'fixed_deposit':
      return {
        figure: formatMoney(product.depositedAmount),
        note: `Deposited · ${formatRate(product.interestRatePercent)} a year · matures ${formatDate(product.maturityDate)}`,
      };
  }
}

export default function ProductCard({ product }: { product: Product }) {
  const nameId = useId();
  const { figure, note } = summary(product);
  return (
    <article className="card dash-card" aria-labelledby={nameId}>
      <div className="product">
        <span id={nameId}>{product.name}</span>
        <span className="mask">{formatMask(product.last4)}</span>
      </div>
      <div className="figure">{figure}</div>
      <p className="note">{note}</p>
    </article>
  );
}
