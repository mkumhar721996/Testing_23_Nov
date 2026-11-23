import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import MenuPage from './pages/MenuPage';
import RestaurantListPage from './pages/RestaurantListPage';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/restaurants" replace />} />
        <Route path="/restaurants" element={<RestaurantListPage />} />
        <Route path="/restaurants/:id" element={<MenuPage />} />
      </Routes>
    </AppShell>
  );
}
