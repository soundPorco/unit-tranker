import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Attendance, AttendanceStatus } from '../types';

export function useAttendance(classId: string) {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .order('date', { ascending: false });
    if (!error && data) setRecords(data as Attendance[]);
    setLoading(false);
  }, [classId]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsertAttendance = async (date: string, status: AttendanceStatus) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('attendance').upsert(
      { class_id: classId, user_id: user?.id ?? null, date, status },
      { onConflict: 'class_id,date' }
    );
    if (!error) await fetch();
    return error;
  };

  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    rate: records.length === 0 ? 0 : Math.round(
      ((records.filter(r => r.status === 'present').length +
        records.filter(r => r.status === 'late').length * 0.5) /
        records.length) * 100
    ),
  };

  return { records, loading, refetch: fetch, upsertAttendance, stats };
}
