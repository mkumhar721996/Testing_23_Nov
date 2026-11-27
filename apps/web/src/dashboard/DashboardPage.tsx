import ComingSoonToast, { useComingSoon } from '../components/ComingSoonToast';
import TopBar from '../components/TopBar';
import './dashboard.css';
import MonthCalendar from './MonthCalendar';
import StatTiles from './StatTiles';

export default function DashboardPage() {
  const comingSoon = useComingSoon();

  return (
    <>
      <TopBar />
      <main className="dashboard-content">
        <div className="page" data-layout="dashboard">
          <div className="page-header">
            <div className="page-title">
              <h1 className="text-3xl">Dashboard</h1>
            </div>
          </div>
          <div className="page-body">
            <StatTiles />
            <div className="dash">
              <MonthCalendar />
            </div>
          </div>
        </div>
      </main>
      <ComingSoonToast message={comingSoon.message} onDismiss={comingSoon.dismiss} />
    </>
  );
}
