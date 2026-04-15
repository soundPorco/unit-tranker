import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface DayActivity {
  attendanceCount: number; // present or late の件数
  assignmentCount: number; // 提出済み課題の件数 (due_date がその日)
  level: 0 | 1 | 2 | 3;   // 色の濃さ (0=なし, 1=薄, 2=中, 3=濃)
}

export type ActivityMap = Record<string, DayActivity>; // "YYYY-MM-DD" -> DayActivity

function calcLevel(attendance: number, assignment: number): 0 | 1 | 2 | 3 {
  const total = attendance + assignment;
  if (total === 0) return 0;
  if (total === 1) return 1;
  if (total <= 3) return 2;
  return 3;
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

    const map: Record<string, { attendanceCount: number; assignmentCount: number }> = {};

    const ensure = (date: string) => {
      if (!map[date]) map[date] = { attendanceCount: 0, assignmentCount: 0 };
    };

    if (attendanceRes.data) {
      for (const row of attendanceRes.data) {
        ensure(row.date);
        map[row.date].attendanceCount += 1;
      }
    }

    if (assignmentRes.data) {
      for (const row of assignmentRes.data) {
        if (!row.due_date) continue;
        const date = row.due_date.slice(0, 10); // "YYYY-MM-DD"
        ensure(date);
        map[date].assignmentCount += 1;
      }
    }

    const result: ActivityMap = {};
    for (const [date, val] of Object.entries(map)) {
      result[date] = {
        ...val,
        level: calcLevel(val.attendanceCount, val.assignmentCount),
      };
    }

    setActivityMap(result);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { activityMap, loading, refetch: fetch };
}
