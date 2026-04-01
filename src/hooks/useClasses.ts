import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Class } from '../types';

export function useClasses(timetableId?: string) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('classes')
      .select('*')
      .order('day_of_week')
      .order('period');
    if (timetableId === 'default') {
      // デフォルト（マイグレーション前）の講義も含める
      query = query.or('timetable_id.is.null,timetable_id.eq.default');
    } else if (timetableId) {
      query = query.eq('timetable_id', timetableId);
    }
    const { data, error } = await query;
    if (!error && data) setClasses(data as Class[]);
    setLoading(false);
  }, [timetableId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addClass = async (input: Omit<Class, 'id' | 'user_id' | 'created_at' | 'timetable_id'>) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('classes').insert({
      ...input,
      timetable_id: timetableId ?? null,
      user_id: user?.id ?? null,
    });
    if (!error) await fetch();
    return error;
  };

  const updateClass = async (id: string, input: Partial<Class>) => {
    const { error } = await supabase.from('classes').update(input).eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) await fetch();
    return error;
  };

  return { classes, loading, refetch: fetch, addClass, updateClass, deleteClass };
}
