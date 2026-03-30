import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Class, DayOfWeek, Period } from '../types';

const DAYS = ['月', '火', '水', '木', '金', '土'];
const PERIODS = [1, 2, 3, 4, 5, 6] as Period[];
const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Props {
  classes: Class[];
  onCellPress: (day: DayOfWeek, period: Period, existing?: Class) => void;
}

export function TimetableGrid({ classes, onCellPress }: Props) {
  const getClass = (day: DayOfWeek, period: Period) =>
    classes.find(c => c.day_of_week === day && c.period === period);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View>
        {/* ヘッダー行 */}
        <View style={styles.row}>
          <View style={styles.periodCell} />
          {DAYS.map((d, i) => (
            <View key={d} style={[styles.headerCell, { backgroundColor: COLORS[i] + '20' }]}>
              <Text style={[styles.headerText, { color: COLORS[i] }]}>{d}</Text>
            </View>
          ))}
        </View>

        {PERIODS.map(period => (
          <View key={period} style={styles.row}>
            <View style={styles.periodCell}>
              <Text style={styles.periodText}>{period}</Text>
            </View>
            {DAYS.map((_, dayIdx) => {
              const day = dayIdx as DayOfWeek;
              const cls = getClass(day, period);
              return (
                <TouchableOpacity
                  key={dayIdx}
                  style={[styles.cell, cls && { backgroundColor: COLORS[dayIdx] + '15' }]}
                  onPress={() => onCellPress(day, period, cls)}
                >
                  {cls ? (
                    <>
                      <Text style={[styles.className, { color: COLORS[dayIdx] }]} numberOfLines={2}>
                        {cls.name}
                      </Text>
                      {cls.teacher && (
                        <Text style={styles.teacher} numberOfLines={1}>{cls.teacher}</Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.empty}>+</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const CELL_W = 72;
const CELL_H = 70;

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  headerCell: {
    width: CELL_W,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  headerText: { fontSize: 13, fontWeight: '700' },
  periodCell: {
    width: 28,
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  periodText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cell: {
    width: CELL_W,
    height: CELL_H,
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  className: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  teacher: { fontSize: 10, color: '#94a3b8', textAlign: 'center', marginTop: 2 },
  empty: { fontSize: 20, color: '#cbd5e1' },
});
