import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AttendanceStatus } from '../types';

interface Props {
  selected?: AttendanceStatus;
  onSelect: (status: AttendanceStatus) => void;
}

const BUTTONS: {
  status: AttendanceStatus;
  label: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { status: 'present', label: '出席', color: '#34C759', icon: 'checkmark-circle' },
  { status: 'late',    label: '遅刻', color: '#FF9500', icon: 'time'             },
  { status: 'absent',  label: '欠席', color: '#FF3B30', icon: 'close-circle'     },
];

export function AttendanceButton({ selected, onSelect }: Props) {
  return (
    <View style={s.row}>
      {BUTTONS.map(({ status, label, color, icon }) => {
        const isSelected = selected === status;
        return (
          <TouchableOpacity
            key={status}
            activeOpacity={0.7}
            style={[
              s.btn,
              isSelected
                ? { backgroundColor: color, borderColor: color }
                : { backgroundColor: '#F2F2F7', borderColor: '#F2F2F7' },
            ]}
            onPress={() => onSelect(status)}
          >
            <Ionicons
              name={icon}
              size={18}
              color={isSelected ? '#FFFFFF' : color}
            />
            <Text style={[s.label, { color: isSelected ? '#FFFFFF' : color }]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
