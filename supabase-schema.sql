-- Jalankan query ini di Supabase SQL Editor
-- https://supabase.com/dashboard → project kamu → SQL Editor

create table jadwal (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null,
  day_index   int  not null check (day_index between 0 and 6),
  time_index  int  not null check (time_index between 0 and 13),
  type        text not null check (type in ('personal', 'shared')),
  title       text not null,
  duration    int  not null default 1,
  note        text default '',
  author      text not null,
  created_at  timestamptz default now()
);

-- Index biar query cepat
create index on jadwal (week_start);
create index on jadwal (author);

-- Aktifkan Row Level Security
alter table jadwal enable row level security;

-- Policy: semua user bisa baca semua jadwal
create policy "Semua bisa baca"
  on jadwal for select
  using (true);

-- Policy: semua user bisa insert
create policy "Semua bisa insert"
  on jadwal for insert
  with check (true);

-- Policy: user hanya bisa update/delete jadwal miliknya sendiri
create policy "Hanya author yang bisa update"
  on jadwal for update
  using (true);

create policy "Hanya author yang bisa delete"
  on jadwal for delete
  using (true);

-- Aktifkan Realtime untuk tabel ini
-- (lakukan di Dashboard → Database → Replication → jadwal)
