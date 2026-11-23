import OrderStatusPage from './orders/OrderStatusPage';

export default function App() {
  const orderId = /^\/orders\/([^/]+)\/?$/.exec(window.location.pathname)?.[1];

  if (orderId) {
    return (
      <main className="app-content">
        <OrderStatusPage orderId={decodeURIComponent(orderId)} />
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-semibold">Web App</h1>
    </main>
  );
}
