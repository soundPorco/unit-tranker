-- ============================================================
-- ユーザーデータ分離修正
-- 1. RLS: user_id IS NULL のデータを許可していた条件を削除
-- 2. 開発中に追加した user_id IS NULL のデータをクリーンアップ
-- ============================================================
-- 事前に Supabase ダッシュボード > Authentication > Sign In Methods で
-- "Allow anonymous sign-ins" を ON にしてください
-- ============================================================

SET search_path TO public;

-- RLS ポリシーを再作成（認証済みユーザーの自分のデータのみ許可）
DROP POLICY IF EXISTS "users own classes"     ON public.classes;
DROP POLICY IF EXISTS "users own attendance"  ON public.attendance;
DROP POLICY IF EXISTS "users own assignments" ON public.assignments;
DROP POLICY IF EXISTS "users own notes"       ON public.notes;

CREATE POLICY "users own classes" ON public.classes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own attendance" ON public.attendance
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own assignments" ON public.assignments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users own notes" ON public.notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 開発中に user_id = NULL で追加したデータを削除
-- (外部キー制約の順序に合わせて子テーブルから削除)
DELETE FROM public.assignments WHERE user_id IS NULL;
DELETE FROM public.attendance  WHERE user_id IS NULL;
DELETE FROM public.notes       WHERE user_id IS NULL;
DELETE FROM public.classes     WHERE user_id IS NULL;
