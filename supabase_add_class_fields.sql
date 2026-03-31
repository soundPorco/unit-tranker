-- classes テーブルに科目詳細フィールドを追加
-- Supabase SQL Editor で実行してください

alter table classes
  add column if not exists credits    int check (credits between 1 and 10),
  add column if not exists class_type text check (class_type in ('required','elective_required','elective')),
  add column if not exists exam_date  date,
  add column if not exists exam_type  text check (exam_type in ('written','report','oral','none'));
