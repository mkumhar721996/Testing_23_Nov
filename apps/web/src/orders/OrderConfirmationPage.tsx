import { Link, useParams } from 'react-router-dom';
import { useSelectedOrder } from './SelectedOrderContext';

export default function OrderConfirmationPage() {
  const { orderId = '' } = useParams();
  const { selectOrder } = useSelectedOrder();

  return (
    <div className="page" data-layout="form">
      <header className="page-header">
        <h1 className="page-title">Order #{orderId} confirmed</h1>
      </header>
      <div className="page-body stack">
        <div className="card stack">
          <h2 className="card-header" style={{ fontSize: 'var(--font-size-xl)' }}>
            Thank you for your order
          </h2>
          <p>The restaurant has your order. You can follow its progress at any time.</p>
          <div className="cluster">
            <Link className="btn btn-primary" to={`/orders/${orderId}`} onClick={() => selectOrder(orderId)}>
              Track order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
