-- Development-only sample data. Not part of the migrations; never run by deploy.
INSERT INTO restaurant (id, name, cuisine, is_open, hours_label, delivery_fee_cents, eta_label) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Harbour Street Noodles', 'Japanese', true, 'Open 11:00 to 22:00', 350, '25–35 min'),
  ('22222222-2222-4222-8222-222222222222', 'Green Bowl Kitchen', 'Vegetarian', false, 'Opens 11:00 tomorrow', 300, '30–40 min'),
  ('33333333-3333-4333-8333-333333333333', 'Sultan''s Grill', 'Turkish', true, 'Open 12:00 to 23:00', 450, '35–45 min')
ON CONFLICT DO NOTHING;

INSERT INTO restaurant_service_area (restaurant_id, location) VALUES
  ('11111111-1111-4111-8111-111111111111', '2000'),
  ('11111111-1111-4111-8111-111111111111', '2010'),
  ('22222222-2222-4222-8222-222222222222', '2040'),
  ('33333333-3333-4333-8333-333333333333', '3000')
ON CONFLICT DO NOTHING;

INSERT INTO menu_category (id, restaurant_id, name, position) VALUES
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'Ramen', 1),
  ('a2222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', 'Bowls', 1),
  ('a3333333-3333-4333-8333-333333333333', '33333333-3333-4333-8333-333333333333', 'Grills', 1)
ON CONFLICT DO NOTHING;

INSERT INTO menu_item (id, category_id, name, description, price_cents, is_available, position) VALUES
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Shoyu ramen', 'Soy broth, egg, spring onion', 1450, true, 1),
  ('b1111111-1111-4111-8111-222222222222', 'a1111111-1111-4111-8111-111111111111', 'Spicy tonkotsu ramen', 'Pork broth with chilli oil', 1650, false, 2),
  ('b2222222-2222-4222-8222-111111111111', 'a2222222-2222-4222-8222-222222222222', 'Harvest grain bowl', 'Roasted vegetables and tahini', 1500, true, 1),
  ('b3333333-3333-4333-8333-111111111111', 'a3333333-3333-4333-8333-333333333333', 'Mixed grill plate', 'Lamb, chicken and rice', 2200, true, 1)
ON CONFLICT DO NOTHING;
