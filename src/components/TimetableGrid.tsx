import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Class, DayOfWeek, Period } from '../types';

const DAYS = ['月', '火', '水', '木', '金', '土'];
const PERIODS = [1, 2, 3, 4, 5, 6] as Period[];

// iOS Calendar ライクな落ち着いたアクセントカラー
const DAY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA'];

const PERIOD_COL_W = 28;
const HEADER_ROW_H = 34;

interface Props {
  classes: Class[];
  onCellPress: (day: DayOfWeek, period: Period, existing?: Class) => void;
}

export function TimetableGrid({ classes, onCellPress }: Props) {
  const { width } = useWindowDimensions();
  const cellWidth = (width - PERIOD_COL_W) / DAYS.length;

  const getClass = (day: DayOfWeek, period: Period) =>
    classes.find(c => c.day_of_week === day && c.period === period);

  return (
    <View style={styles.container}>
      {/* ヘッダー行 */}
      <View style={[styles.row, { height: HEADER_ROW_H }]}>
        <View style={[styles.periodHeader, { width: PERIOD_COL_W }]} />
        {DAYS.map((d, i) => (
          <View key={d} style={[styles.dayHeader, { width: cellWidth }]}>
            <Text style={[styles.dayText, { color: DAY_COLORS[i] }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* グリッド本体：flex:1 で残りの高さを6等分 */}
      <View style={styles.periodsContainer}>
        {PERIODS.map(period => (
          <View key={period} style={styles.periodRow}>
            {/* 限数ラベル */}
            <View style={[styles.periodCell, { width: PERIOD_COL_W }]}>
              <Text style={styles.periodText}>{period}</Text>
            </View>

            {/* 各曜日セル */}
            {DAYS.map((_, dayIdx) => {
              const day = dayIdx as DayOfWeek;
              const cls = getClass(day, period);
              return (
                <TouchableOpacity
                  key={dayIdx}
                  activeOpacity={0.65}
                  style={[
                    styles.cell,
                    { width: cellWidth },
                    cls
                      ? { backgroundColor: '#FFFFFF' }
                      : { backgroundColor: '#F2F2F7' },
                  ]}
                  onPress={() => onCellPress(day, period, cls)}
                >
                  {cls ? (
                    <View style={[styles.classInner, { borderLeftColor: DAY_COLORS[dayIdx] }]}>
                      <Text style={styles.className} numberOfLines={3}>
                        {cls.name}
                      </Text>
                      {cls.room ? (
                        <Text style={styles.roomText} numberOfLines={1}>{cls.room}</Text>
                      ) : null}
                    </View>
                  ) : (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyPlus}>＋</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  periodHeader: {
    backgroundColor: '#F2F2F7',
  },
  dayHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderLeftWidth: 0.5,
    borderLeftColor: '#C6C6C8',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  periodsContainer: {
    flex: 1,
  },
  periodRow: {
    flex: 1,
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  periodCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderRightWidth: 0.5,
    borderRightColor: '#C6C6C8',
  },
  periodText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  cell: {
    flex: 1,
    borderLeftWidth: 0.5,
    borderLeftColor: '#E5E5EA',
    padding: 4,
    overflow: 'hidden',
  },
  classInner: {
    flex: 1,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
    paddingLeft: 5,
    justifyContent: 'center',
  },
  className: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 13,
  },
  roomText: {
    fontSize: 9,
    color: '#8E8E93',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlus: {
    color: '#D1D1D6',
    fontSize: 16,
  },
});
