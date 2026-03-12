-- Receivables / Debts table for Monty App
-- Run this in Supabase > SQL Editor

create table if not exists public.receivables (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null check (type in ('RECEIVABLE', 'DEBT')),
  person      text not null,
  description text not null default '',
  amount      numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  status      text not null default 'PENDING' check (status in ('PENDING','PARTIAL','DONE')),
  date        date not null default current_date,
  due_date    date,
  notes       text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Row Level Security
alter table public.receivables enable row level security;

create policy "Users can manage own receivables"
  on public.receivables
  for all
  using (auth.uid() = user_id);
