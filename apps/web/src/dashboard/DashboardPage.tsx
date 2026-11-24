import { Fragment, useEffect, useState } from 'react';
import ComingSoonToast, { useComingSoon } from '../components/ComingSoonToast';
import TopBar from '../components/TopBar';
import { fetchDashboard } from './dashboard-api';
import './dashboard.css';
import Greeting from './Greeting';
import ProductSection from './ProductSection';
import RecentTransactions from './RecentTransactions';
import type { DashboardResponse, Product } from './types';

const SECTIONS: { type: Product['type']; title: string }[] = [
  { type: 'account', title: 'Accounts' },
  { type: 'credit_card', title: 'Credit cards' },
  { type: 'loan', title: 'Loans' },
  { type: 'fixed_deposit', title: 'Fixed deposits' },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [now] = useState(() => new Date());
  const comingSoon = useComingSoon();

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboard(controller.signal)
      .then(setData)
      // Loading and error states belong to a separate story; until then only the top bar shows.
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <>
      <TopBar />
      {data && (
        <main className="dashboard-content">
          <div className="page" data-layout="dashboard">
            <div className="page-header">
              <Greeting name={data.customer.name} now={now} />
            </div>
            <div className="page-body stack-lg">
              {SECTIONS.map(({ type, title }) => {
                const products = data.products.filter((p) => p.type === type);
                return (
                  <Fragment key={type}>
                    {products.length > 0 && <ProductSection title={title} products={products} />}
                    {type === 'credit_card' && (
                      <RecentTransactions
                        transactions={data.recentTransactions}
                        products={data.products}
                        onViewAll={() => comingSoon.show('Transaction history')}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>
        </main>
      )}
      <ComingSoonToast message={comingSoon.message} onDismiss={comingSoon.dismiss} />
    </>
  );
}
