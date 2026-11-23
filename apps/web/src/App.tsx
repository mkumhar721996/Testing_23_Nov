import { Navigate, Route, Routes } from 'react-router-dom';
import OrderConfirmationPage from './orders/OrderConfirmationPage';
import OrderStatusPage from './orders/OrderStatusPage';
import OrdersPage from './orders/OrdersPage';
import AppShell from './shell/AppShell';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderStatusPage />} />
        <Route path="/orders/:orderId/confirmation" element={<OrderConfirmationPage />} />
        <Route path="*" element={<Navigate to="/orders" replace />} />
      </Route>
    </Routes>
  );
}
