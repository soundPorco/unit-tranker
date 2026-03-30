import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Assignment } from '../types';

interface Props {
  item: Assignment;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
}

export function AssignmentItem({ item, onToggle, onDelete }: Props) {
  const isOverdue = !item.is_submitted && new Date(item.due_date) < new Date();

  return (
    <View style={[styles.card, isOverdue && styles.overdue]}>
      <TouchableOpacity style={styles.checkArea} onPress={() => onToggle(item.id, item.is_submitted)}>
        <View style={[styles.check, item.is_submitted && styles.checkDone]}>
          {item.is_submitted && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, item.is_submitted && styles.submitted]}>{item.title}</Text>
          <Text style={styles.date}>締切: {item.due_date}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>削除</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overdue: {
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  checkArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  info: { flex: 1 },
  title: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
  submitted: { color: '#94a3b8', textDecorationLine: 'line-through' },
  date: { fontSize: 12, color: '#64748b', marginTop: 2 },
  deleteBtn: { padding: 6 },
  deleteText: { fontSize: 12, color: '#ef4444' },
});
