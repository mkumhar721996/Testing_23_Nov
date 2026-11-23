CREATE TABLE restaurant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cuisine text NOT NULL,
  is_open boolean NOT NULL DEFAULT true,
  hours_label text NOT NULL DEFAULT '',
  delivery_fee_cents integer NOT NULL DEFAULT 0,
  eta_label text NOT NULL DEFAULT '',
  menu_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE restaurant_service_area (
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  location text NOT NULL,
  PRIMARY KEY (restaurant_id, location)
);

CREATE TABLE menu_category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

CREATE TABLE menu_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES menu_category(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  is_available boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0
);
