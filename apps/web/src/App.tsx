import { useState } from 'react';
import { PastOrdersPage } from './orders/PastOrdersPage';

type View =
  | { name: 'past-orders' }
  | { name: 'order-status'; orderId: string }
  | { name: 'cart' }
  | { name: 'restaurants' };

// The order status, cart and restaurant list views are placeholders owned by their own stories.
function Placeholder({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">{title}</h1>
      </header>
      {detail && <div className="page-body">{detail}</div>}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>({ name: 'past-orders' });

  switch (view.name) {
    case 'order-status':
      return <Placeholder title="Order status" detail={`Order ${view.orderId}`} />;
    case 'cart':
      return <Placeholder title="Your cart" />;
    case 'restaurants':
      return <Placeholder title="Restaurants" />;
    default:
      return (
        <PastOrdersPage
          onTrackOrder={(orderId) => setView({ name: 'order-status', orderId })}
          onOpenCart={() => setView({ name: 'cart' })}
          onBrowseRestaurants={() => setView({ name: 'restaurants' })}
        />
      );
  }
}
