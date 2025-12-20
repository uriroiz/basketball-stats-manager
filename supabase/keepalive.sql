create table if not exists public.keepalive (
  id int primary key,
  touched_at timestamptz not null default now()
);

insert into public.keepalive (id) values (1)
on conflict (id) do nothing;

alter table public.keepalive enable row level security;

-- Allow anon read-only
create policy "anon_can_read_keepalive"
on public.keepalive
for select
to anon
using (true);


