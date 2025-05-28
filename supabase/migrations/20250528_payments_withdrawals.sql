-- Table des paiements (séquestre, commission, historique)
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id) on delete set null,
  client_id uuid references profiles(id) on delete set null,
  provider_id uuid references profiles(id) on delete set null,
  amount integer not null,
  commission integer not null default 100,
  status text not null check (status in ('pending', 'escrow', 'available', 'transferred')),
  created_at timestamptz default now(),
  released_at timestamptz,
  transfer_request_id uuid references withdrawals(id)
);

-- Table des retraits (withdrawals)
create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references profiles(id) on delete set null,
  amount integer not null,
  commission integer not null default 100,
  status text not null check (status in ('pending', 'completed', 'failed')),
  mobile_wallet_number text not null,
  wallet_operator text,
  requested_at timestamptz default now(),
  completed_at timestamptz
);

-- Index pour la rapidité
create index if not exists idx_payments_provider on payments(provider_id);
create index if not exists idx_withdrawals_provider on withdrawals(provider_id);
