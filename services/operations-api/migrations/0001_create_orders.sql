CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL,
  restaurant_name text NOT NULL,
  fulfilment text NOT NULL CHECK (fulfilment IN ('pickup', 'delivery')),
  status text NOT NULL DEFAULT 'placed'
    CHECK (status IN ('placed', 'accepted', 'preparing', 'ready', 'completed')),
  placed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_customer_id_placed_at_idx ON orders (customer_id, placed_at DESC);
