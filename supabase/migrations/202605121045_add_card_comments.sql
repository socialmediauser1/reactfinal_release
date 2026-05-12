alter table public.cards
  add column if not exists comments jsonb not null default '[]'::jsonb;

update public.cards
set comments = '[]'::jsonb
where comments is null;
