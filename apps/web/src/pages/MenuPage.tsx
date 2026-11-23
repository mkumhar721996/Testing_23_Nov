import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { NotFoundError, getMenu, type RestaurantMenu } from '../api/restaurants';
import { Icon } from '../components/Icon';
import { MenuItemRow } from '../components/MenuItemRow';
import { formatCents } from '../lib/money';
import { formatUpdated } from '../lib/relativeTime';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; menu: RestaurantMenu };

export default function MenuPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  // Fetched on every mount and retry, never cached, so an updated menu shows at once.
  useEffect(() => {
    let current = true;
    setState({ status: 'loading' });
    getMenu(id)
      .then((menu) => current && setState({ status: 'ready', menu }))
      .catch((error) => current && setState({ status: error instanceof NotFoundError ? 'not-found' : 'error' }));
    return () => {
      current = false;
    };
  }, [id, attempt]);

  const back = () => navigate('/restaurants');

  if (state.status === 'loading') {
    return (
      <div className="page">
        <div className="page-body stack">
          <div role="status" aria-label="Loading menu">
            <div
              className="skeleton"
              style={{ height: 'var(--space-4)', maxWidth: 'var(--container-sm)', marginBottom: 'var(--space-2)' }}
            />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        </div>
      </div>
    );
  }

  if (state.status === 'not-found') {
    return (
      <div className="page">
        <div className="empty-state">
          <Icon name="flag" size="lg" />
          <h2 className="text-xl">We couldn't find that restaurant</h2>
          <p className="text-muted">It may have been removed. Go back and pick another restaurant.</p>
          <button className="btn btn-secondary" type="button" onClick={back}>
            Back to restaurants
          </button>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="page">
        <div className="page-body stack">
          <div className="alert alert-danger" role="alert">
            <div>
              <strong>We couldn't load this menu.</strong>
              <p>The restaurant is still listed. Try again, or go back and pick another restaurant.</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { menu } = state;
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/restaurants">Restaurants</Link>
          </nav>
          <h1 className="page-title">{menu.name}</h1>
          <p className="text-muted">{menu.cuisine}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" type="button" onClick={back}>
            <Icon name="home" /> Back to restaurants
          </button>
        </div>
      </header>

      <div className="page-body stack">
        {!menu.isOpen && (
          <div className="alert alert-warning" role="status">
            <div>
              <strong>This restaurant is closed right now.</strong> {menu.hoursLabel} You can still read the menu.
            </div>
          </div>
        )}
        <div className="menu-layout">
          <div className="stack-lg">
            {menu.categories.map((category, index) => (
              <section key={`${category.name}-${index}`} aria-labelledby={`cat-${index}`}>
                <h2 className="menu-cat" id={`cat-${index}`}>
                  {category.name}
                </h2>
                <ul className="card card-flush menu-items">
                  {category.items.map((item) => (
                    <MenuItemRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <aside className="card stack-sm" aria-label="Restaurant details">
            <h2 className="text-lg font-semibold">Details</h2>
            <p className="rest-meta">
              <span>
                <Icon name="clock" />
                <span>{menu.hoursLabel}</span>
              </span>
            </p>
            <p className="rest-meta">
              <span>
                <Icon name="tag" />
                <span>{`Delivery ${formatCents(menu.deliveryFeeCents)}, ${menu.etaLabel}`}</span>
              </span>
            </p>
            <p className="rest-meta">
              <span>
                <Icon name="flag" />
                <span>{`Serves ${menu.serviceLocations.join(', ')}`}</span>
              </span>
            </p>
            <div className="divider" />
            <p className="text-sm text-muted">{`Menu updated ${formatUpdated(menu.menuUpdatedAt)}.`}</p>
            <p className="text-sm text-muted">Browsing as a guest. You don't need to sign in to read a menu.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
