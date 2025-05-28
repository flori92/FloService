-- Table pour les factures automatiques
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  payment_id uuid references payments(id) on delete set null,
  offer_id uuid references service_offers(id) on delete set null,
  provider_id uuid references profiles(id) on delete set null,
  client_id uuid references profiles(id) on delete set null,
  amount integer not null,
  commission integer not null default 100,
  tax_rate integer not null default 18,
  tax_amount integer not null,
  total_amount integer not null,
  status text not null check (status in ('draft', 'sent', 'paid')),
  invoice_number text not null unique,
  invoice_url text,
  provider_details jsonb,
  client_details jsonb
);

-- Index pour la performance
create index if not exists idx_invoices_provider on invoices(provider_id);
create index if not exists idx_invoices_client on invoices(client_id);
create index if not exists idx_invoices_payment on invoices(payment_id);
create index if not exists idx_invoices_offer on invoices(offer_id);

-- Créer un bucket de stockage pour les factures PDF
insert into storage.buckets (id, name, public) values ('invoices', 'invoices', true)
on conflict (id) do nothing;

-- Politique de sécurité pour le bucket de factures
create policy "Les factures sont accessibles publiquement"
  on storage.objects for select
  using (bucket_id = 'invoices');

create policy "Seuls les administrateurs peuvent insérer des factures"
  on storage.objects for insert
  using (bucket_id = 'invoices' and (auth.role() = 'service_role' or auth.role() = 'authenticated'));
