import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AttendanceStatus } from '../types';

interface Props {
  selected?: AttendanceStatus;
  onSelect: (status: AttendanceStatus) => void;
}

const BUTTONS: { status: AttendanceStatus; label: string; color: string }[] = [
  { status: 'present', label: '出席', color: '#22c55e' },
  { status: 'late',    label: '遅刻', color: '#f59e0b' },
  { status: 'absent',  label: '欠席', color: '#ef4444' },
];

export function AttendanceButton({ selected, onSelect }: Props) {
  return (
    <View style={styles.row}>
      {BUTTONS.map(({ status, label, color }) => {
        const isSelected = selected === status;
        return (
          <TouchableOpacity
            key={status}
            style={[
              styles.btn,
              { borderColor: color },
              isSelected && { backgroundColor: color },
            ]}
            onPress={() => onSelect(status)}
          >
            <Text style={[styles.label, { color: isSelected ? '#fff' : color }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
