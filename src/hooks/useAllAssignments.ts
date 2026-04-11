import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AssignmentWithClass {
  id: string;
  class_id: string;
  title: string;
  due_date: string | null;
  is_submitted: boolean;
  created_at: string;
  classes: {
    name: string;
    day_of_week: number;
  } | null;
}

export function useAllAssignments() {
  const [assignments, setAssignments] = useState<AssignmentWithClass[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assignments')
      .select('*, classes(name, day_of_week)')
      .order('due_date', { ascending: true });
    if (!error && data) setAssignments(data as AssignmentWithClass[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleSubmitted = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('assignments')
      .update({ is_submitted: !current })
      .eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (!error) await fetch();
    return error;
  };

  return { assignments, loading, refetch: fetch, toggleSubmitted, deleteAssignment };
}
