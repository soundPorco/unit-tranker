-- RLSポリシーを未ログイン対応に修正
-- Supabase SQL Editor に貼り付けて実行してください

drop policy if exists "users own classes" on classes;
drop policy if exists "users own attendance" on attendance;
drop policy if exists "users own assignments" on assignments;
drop policy if exists "users own notes" on notes;

create policy "users own classes" on classes
  for all using (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  ) with check (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

create policy "users own attendance" on attendance
  for all using (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  ) with check (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

create policy "users own assignments" on assignments
  for all using (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  ) with check (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );

create policy "users own notes" on notes
  for all using (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  ) with check (
    auth.uid() = user_id
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );
