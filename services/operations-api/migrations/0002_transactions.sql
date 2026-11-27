CREATE TABLE transactions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  customer_id text NOT NULL REFERENCES people (id),
  kind text NOT NULL CHECK (kind IN ('debit', 'card_purchase', 'transfer_in', 'fee', 'deposit', 'loan_repayment')),
  status text NOT NULL CHECK (status IN ('posted', 'pending')),
  amount_minor bigint NOT NULL CHECK (amount_minor > 0), -- magnitude in minor units; kind gives the direction
  currency text NOT NULL DEFAULT 'GBP',
  category text,
  description text NOT NULL,
  posted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transactions_customer_posted_idx ON transactions (customer_id, posted_at DESC);
