import { AccountList } from './AccountList';
import { BalanceSummary } from './BalanceSummary';
import { DashboardSkeleton, EmptyState, ErrorState } from './DashboardStates';
import { greeting } from './format';
import { CardsSection, LoansSection, SavingsSection } from './ProductSections';
import { RecentTransactions } from './RecentTransactions';
import { SpendingSection } from './SpendingSection';
import { TopBar } from './TopBar';
import { useDashboard } from './useDashboard';
import type { DashboardData } from './types';

interface DashboardPageProps {
  onTransfer?: () => void;
  onPayBill?: () => void;
}

const openTransfer = () => window.location.assign('/transfer');
const openPayBill = () => window.location.assign('/pay-bill');

function Dashboard({
  data,
  onTransfer,
  onPayBill,
}: { data: DashboardData } & Required<DashboardPageProps>) {
  return (
    <div className="stack-lg stack">
      <div className="page-header">
        <div className="page-title">
          <h1>{greeting(new Date().getHours(), data.customerName)}</h1>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary" onClick={onTransfer}>
            Transfer money
          </button>
          <button type="button" className="btn btn-primary" onClick={onPayBill}>
            Pay a bill
          </button>
        </div>
      </div>
      <BalanceSummary data={data} />
      <div className="cols">
        <AccountList accounts={data.accounts} currency={data.currency} />
        <RecentTransactions transactions={data.recentTransactions} currency={data.currency} />
      </div>
      <SavingsSection products={data.savings} />
      <CardsSection products={data.cards} />
      <LoansSection products={data.loans} />
      <SpendingSection items={data.spendingByCategory} currency={data.currency} />
    </div>
  );
}

export function DashboardPage({
  onTransfer = openTransfer,
  onPayBill = openPayBill,
}: DashboardPageProps) {
  const state = useDashboard();
  return (
    <>
      <TopBar customerName={state.status === 'ready' ? state.data.customerName : undefined} />
      <main className="container page dash">
        {state.status === 'loading' && <DashboardSkeleton />}
        {state.status === 'error' && <ErrorState retried={state.retried} onRetry={state.retry} />}
        {state.status === 'ready' &&
          (state.data.accounts.length === 0 ? (
            <EmptyState />
          ) : (
            <Dashboard data={state.data} onTransfer={onTransfer} onPayBill={onPayBill} />
          ))}
      </main>
    </>
  );
}
