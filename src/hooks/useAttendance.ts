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

  const upsertAttendance = async (date: string, status: AttendanceStatus, memo?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('attendance').upsert(
      { class_id: classId, user_id: user?.id ?? null, date, status, memo: memo?.trim() || null },
      { onConflict: 'class_id,date' }
    );
    if (!error) await fetch();
    return error;
  };

  const deleteAttendance = async (id: string) => {
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const counted = records.filter(r => r.status !== 'cancelled');
  const stats = {
    total: counted.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    cancelled: records.filter(r => r.status === 'cancelled').length,
    rate: counted.length === 0 ? 0 : Math.round(
      ((counted.filter(r => r.status === 'present').length +
        counted.filter(r => r.status === 'late').length * 0.5) /
        counted.length) * 100
    ),
  };

  return { records, loading, refetch: fetch, upsertAttendance, deleteAttendance, stats };
}
