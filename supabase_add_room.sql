-- classes テーブルに教室カラムを追加
-- Supabase SQL Editor で実行してください
alter table classes add column if not exists room text;
