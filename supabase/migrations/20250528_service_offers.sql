-- Table des offres de service avec lien de paiement
create table if not exists service_offers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references profiles(id) on delete set null,
  client_id uuid references profiles(id) on delete set null,
  service_id uuid references services(id) on delete set null,
  amount integer not null,
  description text,
  status text not null check (status in ('pending', 'paid', 'cancelled', 'expired')),
  payment_link text,
  payment_link_id text,
  created_at timestamptz default now(),
  expires_at timestamptz,
  paid_at timestamptz
);

-- Index pour la performance
create index if not exists idx_service_offers_provider on service_offers(provider_id);
create index if not exists idx_service_offers_client on service_offers(client_id);

-- Table des notifications (si elle n'existe pas déjà)
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  content text not null,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on notifications(user_id);
