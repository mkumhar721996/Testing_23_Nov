import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { listRestaurants, type RestaurantSummary } from '../api/restaurants';
import { Icon } from '../components/Icon';
import { RestaurantCard } from '../components/RestaurantCard';

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; restaurants: RestaurantSummary[] };

export default function RestaurantListPage() {
  const [params, setParams] = useSearchParams();
  const location = params.get('location')?.trim() || undefined;
  const [draft, setDraft] = useState(location ?? '');
  const [state, setState] = useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // The total across all restaurants, for the "X of N" line; known once an unfiltered load has run.
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => setDraft(location ?? ''), [location]);

  useEffect(() => {
    let current = true;
    setState({ status: 'loading' });
    listRestaurants(location)
      .then(({ restaurants }) => {
        if (!current) return;
        if (!location) setTotal(restaurants.length);
        setState({ status: 'ready', restaurants });
      })
      .catch(() => current && setState({ status: 'error' }));
    return () => {
      current = false;
    };
  }, [location, attempt]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    setParams(value ? { location: value } : {});
  }

  const clear = () => setParams({});

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Restaurants</h1>
          <p className="text-muted">Browse every restaurant and read its menu. No sign-in needed.</p>
        </div>
      </header>

      <div className="page-body stack">
        {state.status === 'loading' ? (
          <>
            <div className="skeleton" style={{ height: 'var(--control-height-md)', maxWidth: 'var(--container-sm)' }} />
            <div className="rest-grid" role="status" aria-label="Loading restaurants">
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
            </div>
          </>
        ) : (
          <>
            <form className="loc-form" onSubmit={submit} noValidate>
              <div className="field">
                <label htmlFor="loc">{location ? 'Delivery location' : 'Delivery location (optional)'}</label>
                <input
                  className="input"
                  id="loc"
                  name="loc"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder={location ? undefined : 'Postcode, for example 2000'}
                  aria-describedby="loc-hint"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <p className="field-hint" id="loc-hint">
                  {location
                    ? state.status === 'ready' && state.restaurants.length === 0
                      ? 'Check the postcode, or try a nearby one.'
                      : 'Showing only restaurants that serve this location.'
                    : 'Leave empty to see every restaurant.'}
                </p>
              </div>
              <button className="btn btn-primary" type="submit">
                {location ? (
                  'Update location'
                ) : (
                  <>
                    <Icon name="search" /> Show restaurants for this location
                  </>
                )}
              </button>
              {location && (
                <button className="btn btn-ghost" type="button" onClick={clear}>
                  Clear location
                </button>
              )}
            </form>

            {state.status === 'error' && (
              <div className="alert alert-danger" role="alert">
                <div>
                  <strong>We couldn't load the restaurants.</strong>
                  <p>Something went wrong on our side. Your location is kept; try again in a moment.</p>
                </div>
                <button className="btn btn-secondary" type="button" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </button>
              </div>
            )}

            {state.status === 'ready' && state.restaurants.length === 0 && (
              <div className="empty-state" role="status">
                <Icon name="flag" size="lg" />
                {location ? (
                  <>
                    <h2 className="text-xl">{`No restaurant serves ${location}`}</h2>
                    <p className="text-muted">
                      None of our restaurants deliver to this location yet. Try a different postcode, or clear the
                      location to see every restaurant.
                    </p>
                    <button className="btn btn-secondary" type="button" onClick={clear}>
                      Show all restaurants
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl">No restaurants yet</h2>
                    <p className="text-muted">Restaurants will appear here as soon as they join.</p>
                  </>
                )}
              </div>
            )}

            {state.status === 'ready' && state.restaurants.length > 0 && (
              <>
                <p className="count-line text-muted" role="status">
                  {location
                    ? total !== null
                      ? `${state.restaurants.length} of ${total} restaurants serve ${location}`
                      : `${state.restaurants.length} restaurants serve ${location}`
                    : `${state.restaurants.length} restaurants`}
                </p>
                <ul className="rest-grid" aria-label={location ? `Restaurants serving ${location}` : 'All restaurants'}>
                  {state.restaurants.map((r) => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
