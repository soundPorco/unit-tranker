import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Assignment } from '../types';

export function useAssignments(classId?: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('assignments').select('*').order('due_date');
    if (classId) query = query.eq('class_id', classId);
    const { data, error } = await query;
    if (!error && data) setAssignments(data as Assignment[]);
    setLoading(false);
  }, [classId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addAssignment = async (input: { title: string; due_date?: string; memo?: string; class_id?: string }) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('assignments').insert({
      ...input,
      class_id: input.class_id ?? classId,
      user_id: user?.id ?? null,
      is_submitted: false,
    });
    if (!error) await fetch();
    return error;
  };

  const toggleSubmitted = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('assignments')
      .update({ is_submitted: !current })
      .eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const updateAssignment = async (id: string, input: { title: string; due_date?: string | null; memo?: string | null }) => {
    const { error } = await supabase.from('assignments').update(input).eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const deleteAssignment = async (id: string) => {
    const { error } = await supabase.from('assignments').delete().eq('id', id);
    if (!error) await fetch();
    return error;
  };

  const stats = {
    total: assignments.length,
    submitted: assignments.filter(a => a.is_submitted).length,
    rate: assignments.length === 0 ? 0 : Math.round(
      (assignments.filter(a => a.is_submitted).length / assignments.length) * 100
    ),
  };

  return { assignments, loading, refetch: fetch, addAssignment, toggleSubmitted, updateAssignment, deleteAssignment, stats };
}
