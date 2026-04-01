-- classes テーブルに timetable_id カラムを追加
ALTER TABLE classes ADD COLUMN IF NOT EXISTS timetable_id TEXT;

-- インデックスを追加してフィルタリングを高速化
CREATE INDEX IF NOT EXISTS classes_timetable_id_idx ON classes(timetable_id);
