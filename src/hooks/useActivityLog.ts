import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DayActivity {
  score: number;             // 重み付きスコアの合計
  assignmentCount: number;   // 提出済み課題の件数
  level: 0 | 1 | 2 | 3 | 4; // 色の濃さ (0=なし, 1〜4=薄→濃)
}

export type ActivityMap = Record<string, DayActivity>; // "YYYY-MM-DD" -> DayActivity

// 出席ステータスごとの重み
// present: 2, late: 1, absent/cancelled: 0
const ATTENDANCE_WEIGHT: Record<string, number> = {
  present: 1,
  late: 0.5,
};

// 課題提出ごとの重み
const ASSIGNMENT_WEIGHT = 1;

function calcLevel(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score === 0) return 0;
  if (score <= 1) return 1;
  if (score <= 2) return 2;
  if (score <= 4) return 3;
  return 4; // 5以上で深緑
}

export function useActivityLog() {
  const [activityMap, setActivityMap] = useState<ActivityMap>({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);

    const [attendanceRes, assignmentRes] = await Promise.all([
      supabase
        .from('attendance')
        .select('date, status')
        .in('status', ['present', 'late']),
      supabase
        .from('assignments')
        .select('due_date')
        .eq('is_submitted', true)
        .not('due_date', 'is', null),
    ]);

    const map: Record<string, { score: number; assignmentCount: number }> = {};

    const ensure = (date: string) => {
      if (!map[date]) map[date] = { score: 0, assignmentCount: 0 };
    };

    if (attendanceRes.data) {
      for (const row of attendanceRes.data) {
        ensure(row.date);
        map[row.date].score += ATTENDANCE_WEIGHT[row.status] ?? 0;
      }
    }

    if (assignmentRes.data) {
      for (const row of assignmentRes.data) {
        if (!row.due_date) continue;
        const date = row.due_date.slice(0, 10);
        ensure(date);
        map[date].score += ASSIGNMENT_WEIGHT;
        map[date].assignmentCount += 1;
      }
    }

    const result: ActivityMap = {};
    for (const [date, val] of Object.entries(map)) {
      result[date] = {
        ...val,
        level: calcLevel(val.score),
      };
    }

    setActivityMap(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();

    const channel = supabase
      .channel('activity-log-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  return { activityMap, loading, refetch: fetch };
}
