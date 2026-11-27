import ComingSoonToast, { useComingSoon } from '../components/ComingSoonToast';
import TopBar from '../components/TopBar';
import './dashboard.css';
import RevenueOverview from './RevenueOverview';
import StatTiles from './StatTiles';
import TopDestinationsCard from './TopDestinationsCard';

export default function DashboardPage() {
  const comingSoon = useComingSoon();

  return (
    <>
      <TopBar onComingSoon={comingSoon.show} onError={comingSoon.notify} />
      <main className="dashboard-content">
        <div className="page" data-layout="dashboard">
          <div className="page-header">
            <div className="page-title">
              <h1 className="text-3xl">Dashboard</h1>
            </div>
          </div>
          <div className="page-body">
            <StatTiles />
            <div className="pair">
              <RevenueOverview />
              <TopDestinationsCard />
            </div>
          </div>
        </div>
      </main>
      <ComingSoonToast message={comingSoon.message} onDismiss={comingSoon.dismiss} />
    </>
  );
}
