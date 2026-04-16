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
  icon: keyof typeof Ionicons.glyphMap;
  filled: boolean;
}[] = [
  { status: 'present',   label: '出席', icon: 'checkmark-circle', filled: true  },
  { status: 'late',      label: '遅刻', icon: 'time',             filled: false },
  { status: 'absent',    label: '欠席', icon: 'close-circle',     filled: false },
  { status: 'cancelled', label: '休講', icon: 'ban',              filled: false },
];

export function AttendanceButton({ selected, onSelect }: Props) {
  return (
    <View style={s.row}>
      {BUTTONS.map(({ status, label, icon, filled }) => {
        const isSelected = selected === status;
        const activeBg    = filled ? '#F59E0B' : 'transparent';
        const activeBorder = filled ? '#F59E0B' : '#6C6C70';
        const activeText  = filled ? '#FFFFFF'  : '#6C6C70';
        return (
          <TouchableOpacity
            key={status}
            activeOpacity={0.7}
            style={[
              s.btn,
              isSelected
                ? { backgroundColor: activeBg, borderColor: activeBorder }
                : { backgroundColor: '#F2F2F7', borderColor: '#F2F2F7' },
            ]}
            onPress={() => onSelect(status)}
          >
            <Ionicons
              name={icon}
              size={18}
              color={isSelected ? activeText : '#8E8E93'}
            />
            <Text style={[s.label, { color: isSelected ? activeText : '#8E8E93' }]}>
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
    paddingVertical: 13,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});
