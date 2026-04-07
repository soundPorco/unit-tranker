import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface ClassStat {
  attendanceRate: number;
  submissionRate: number;
}

export function useAllClassStats(classIds: string[]) {
  const [stats, setStats] = useState<Record<string, ClassStat>>({});
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (classIds.length === 0) return;
    setLoading(true);

    const [attRes, asgRes] = await Promise.all([
      supabase.from('attendance').select('class_id, status').in('class_id', classIds),
      supabase.from('assignments').select('class_id, is_submitted').in('class_id', classIds),
    ]);

    const next: Record<string, ClassStat> = {};

    for (const id of classIds) {
      const attRecords = (attRes.data ?? []).filter(r => r.class_id === id);
      const asgRecords = (asgRes.data ?? []).filter(r => r.class_id === id);

      const counted  = attRecords.filter(r => r.status !== 'cancelled');
      const present  = counted.filter(r => r.status === 'present').length;
      const late     = counted.filter(r => r.status === 'late').length;
      const attRate  = counted.length === 0 ? 0
        : Math.round(((present + late * 0.5) / counted.length) * 100);

      const submitted = asgRecords.filter(r => r.is_submitted).length;
      const asgRate   = asgRecords.length === 0 ? 0
        : Math.round((submitted / asgRecords.length) * 100);

      next[id] = { attendanceRate: attRate, submissionRate: asgRate };
    }

    setStats(next);
    setLoading(false);
  }, [classIds.join(',')]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, refetch: fetch };
}
