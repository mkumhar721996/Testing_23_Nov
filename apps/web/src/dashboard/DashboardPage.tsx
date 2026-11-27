import ComingSoonToast, { useComingSoon } from '../components/ComingSoonToast';
import TopBar from '../components/TopBar';
import './dashboard.css';
import Messages from './Messages';
import RecentTrips from './RecentTrips';
import StatTiles from './StatTiles';
import TravelAreas from './TravelAreas';
import TravelPackages from './TravelPackages';
import UpcomingTrips from './UpcomingTrips';

export default function DashboardPage() {
  const comingSoon = useComingSoon();

  return (
    <>
      <TopBar onComingSoon={comingSoon.show} onError={comingSoon.notify} />
      <main className="dashboard-content">
        <div className="page" data-layout="dashboard">
          <TravelAreas onComingSoon={comingSoon.show} />
          <div className="page-header">
            <div className="page-title">
              <h1 className="text-3xl">Dashboard</h1>
            </div>
          </div>
          <div className="page-body">
            <div className="dash">
              <div className="dash-main">
                <StatTiles />
                <Messages onComingSoon={comingSoon.show} />
                <TravelPackages onComingSoon={comingSoon.show} />
                <RecentTrips onComingSoon={comingSoon.show} />
              </div>
              <div className="dash-side">
                <UpcomingTrips onComingSoon={comingSoon.show} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <ComingSoonToast message={comingSoon.message} onDismiss={comingSoon.dismiss} />
    </>
  );
}
