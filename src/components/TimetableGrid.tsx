import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Class, DayOfWeek, Period } from '../types';

const DAYS = ['月', '火', '水', '木', '金', '土'];
const PERIODS = [1, 2, 3, 4, 5, 6] as Period[];
const COLORS = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const PERIOD_COL_W = 24; // 限数列の固定幅
const GRID_PADDING = 16; // TimetableScreen の grid padding (左右各8)

interface Props {
  classes: Class[];
  onCellPress: (day: DayOfWeek, period: Period, existing?: Class) => void;
}

export function TimetableGrid({ classes, onCellPress }: Props) {
  const { width } = useWindowDimensions();
  // 画面幅からパディングと限数列を引いた残りを6列で均等分割
  const cellWidth = (width - GRID_PADDING * 2 - PERIOD_COL_W) / DAYS.length;
  const cellHeight = Math.max(56, Math.round(cellWidth * 0.85));

  const getClass = (day: DayOfWeek, period: Period) =>
    classes.find(c => c.day_of_week === day && c.period === period);

  return (
    <View>
      {/* ヘッダー行 */}
      <View style={styles.row}>
        <View style={[styles.periodCell, { width: PERIOD_COL_W, height: 32 }]} />
        {DAYS.map((d, i) => (
          <View
            key={d}
            style={[styles.headerCell, { width: cellWidth, backgroundColor: COLORS[i] + '20' }]}
          >
            <Text style={[styles.headerText, { color: COLORS[i] }]}>{d}</Text>
          </View>
        ))}
      </View>

      {PERIODS.map(period => (
        <View key={period} style={styles.row}>
          <View style={[styles.periodCell, { width: PERIOD_COL_W, height: cellHeight }]}>
            <Text style={styles.periodText}>{period}</Text>
          </View>
          {DAYS.map((_, dayIdx) => {
            const day = dayIdx as DayOfWeek;
            const cls = getClass(day, period);
            return (
              <TouchableOpacity
                key={dayIdx}
                style={[
                  styles.cell,
                  { width: cellWidth, height: cellHeight },
                  cls && { backgroundColor: COLORS[dayIdx] + '15' },
                ]}
                onPress={() => onCellPress(day, period, cls)}
              >
                {cls ? (
                  <>
                    <Text
                      style={[styles.className, { color: COLORS[dayIdx] }]}
                      numberOfLines={2}
                    >
                      {cls.name}
                    </Text>
                    {cls.room && (
                      <Text style={styles.room} numberOfLines={1}>{cls.room}</Text>
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  headerCell: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  headerText: { fontSize: 12, fontWeight: '700' },
  periodCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
  },
  periodText: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  cell: {
    borderWidth: 0.5,
    borderColor: '#e2e8f0',
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  className: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  room: { fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 1 },
  empty: { fontSize: 18, color: '#cbd5e1' },
});
