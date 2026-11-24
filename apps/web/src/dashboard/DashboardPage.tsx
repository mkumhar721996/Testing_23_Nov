import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';
import { fetchDashboard } from './dashboard-api';
import './dashboard.css';
import Greeting from './Greeting';
import ProductSection from './ProductSection';
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
                return products.length > 0 ? (
                  <ProductSection key={type} title={title} products={products} />
                ) : null;
              })}
            </div>
          </div>
        </main>
      )}
    </>
  );
}
