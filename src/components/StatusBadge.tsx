import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Status = 'good' | 'warning' | 'danger';

interface Props {
  attendanceRate: number;
  submissionRate: number;
}

function getStatus(attendanceRate: number, submissionRate: number): Status {
  if (attendanceRate < 60 || submissionRate < 50) return 'danger';
  if (attendanceRate < 80 || submissionRate < 70) return 'warning';
  return 'good';
}

const STATUS_CONFIG: Record<Status, { label: string; color: string }> = {
  good:    { label: '良好',  color: '#22c55e' },
  warning: { label: '注意',  color: '#f59e0b' },
  danger:  { label: '危険',  color: '#ef4444' },
};

export function StatusBadge({ attendanceRate, submissionRate }: Props) {
  const status = getStatus(attendanceRate, submissionRate);
  const { label, color } = STATUS_CONFIG[status];

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
