-- 在 Supabase 项目的 SQL Editor 里粘贴并运行这整段脚本

create table if not exists expressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  en text not null,
  zh text not null,
  example text,
  tag text default '未分类',
  status text default 'new',
  review_count int default 0,
  last_reviewed timestamptz,
  added_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  date timestamptz default now(),
  expr_ids uuid[],
  scenario_zh text,
  user_en text,
  feedback jsonb,
  score int
);

create table if not exists user_settings (
  user_id uuid primary key references auth.users not null,
  deepseek_api_key text
);

-- 开启行级安全(RLS)，保证每个人只能读写自己的数据
alter table expressions enable row level security;
alter table sessions enable row level security;
alter table user_settings enable row level security;

create policy "own expressions" on expressions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own sessions" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
