-- ============================================================
-- unit-tracker: Supabase テーブル設計 & RLS ポリシー
-- Supabase SQL Editor に貼り付けて実行してください
-- ============================================================

-- 1. classes（講義）
create table if not exists classes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  name            text not null,
  teacher         text,
  day_of_week     int not null check (day_of_week between 0 and 5),
  period          int not null check (period between 1 and 6),
  evaluation_type text not null default 'balanced'
                    check (evaluation_type in ('attendance','assignment','exam','balanced')),
  memo            text,
  created_at      timestamptz default now()
);

-- 2. attendance（出席記録）
create table if not exists attendance (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid references classes(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  date       date not null,
  status     text not null check (status in ('present','absent','late')),
  created_at timestamptz default now(),
  unique(class_id, date)
);

-- 3. assignments（課題）
create table if not exists assignments (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid references classes(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  title        text not null,
  due_date     date not null,
  is_submitted boolean not null default false,
  created_at   timestamptz default now()
);

-- 4. notes（メモ 1講義1件）
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid references classes(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  content    text,
  updated_at timestamptz default now(),
  unique(class_id, user_id)
);

-- ============================================================
-- RLS ポリシー
-- ============================================================

alter table classes    enable row level security;
alter table attendance enable row level security;
alter table assignments enable row level security;
alter table notes      enable row level security;

-- classes
create policy "users own classes" on classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- attendance
create policy "users own attendance" on attendance
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- assignments
create policy "users own assignments" on assignments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- notes
create policy "users own notes" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- インデックス（パフォーマンス）
-- ============================================================
create index if not exists idx_classes_user    on classes(user_id);
create index if not exists idx_attendance_class on attendance(class_id);
create index if not exists idx_attendance_user  on attendance(user_id);
create index if not exists idx_assignments_class on assignments(class_id);
create index if not exists idx_assignments_due  on assignments(due_date);
create index if not exists idx_notes_class      on notes(class_id);
