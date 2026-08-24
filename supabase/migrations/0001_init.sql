-- Schema RSVP matrimonio
-- Pegar en: Supabase Dashboard → SQL Editor → New query

create table if not exists guests (
  id text primary key,
  name text not null,
  normalized text not null,
  rsvp jsonb not null default '{"status":"pending","attendees":1,"dietary":"","message":"","confirmedAt":null}'::jsonb,
  updated_at timestamptz default now()
);

-- Índice para búsqueda por normalized
create index if not exists guests_normalized_idx on guests (normalized);

-- Row Level Security: lectura pública (búsqueda), escritura pública (confirmación)
alter table guests enable row level security;

drop policy if exists "lectura publica" on guests;
create policy "lectura publica" on guests for select using (true);

drop policy if exists "escritura publica update" on guests;
create policy "escritura publica update" on guests for update using (true) with check (true);

drop policy if exists "escritura publica insert" on guests;
create policy "escritura publica insert" on guests for insert with check (true);

-- Trigger para updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists guests_updated_at on guests;
create trigger guests_updated_at
  before update on guests
  for each row execute function set_updated_at();