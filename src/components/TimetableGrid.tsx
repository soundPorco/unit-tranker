import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { Class, DayOfWeek, Period, TimetableSettings } from '../types';

const ALL_DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const ALL_DAY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF6B6B'];

const DAY_INDICES: Record<TimetableSettings['daysMode'], number[]> = {
  weekdays:     [0, 1, 2, 3, 4],
  weekdays_sat: [0, 1, 2, 3, 4, 5],
  all:          [0, 1, 2, 3, 4, 5, 6],
};

const PERIOD_COL_W = 44; // 限数 + 時間表示に必要な幅
const SEMESTER_ROW_H = 26;
const HEADER_ROW_H = 32;

interface Props {
  classes: Class[];
  settings: TimetableSettings;
  onCellPress: (day: DayOfWeek, period: Period, existing?: Class) => void;
}

export function TimetableGrid({ classes, settings, onCellPress }: Props) {
  const { width } = useWindowDimensions();
  const dayIndices = DAY_INDICES[settings.daysMode];
  const cellWidth = (width - PERIOD_COL_W) / dayIndices.length;
  const periods = Array.from({ length: settings.periodCount }, (_, i) => (i + 1) as Period);

  const getClass = (day: DayOfWeek, period: Period) =>
    classes.find(c => c.day_of_week === day && c.period === period);

  return (
    <View style={styles.container}>
      {/* 学期バナー */}
      <View style={[styles.semesterBanner, { height: SEMESTER_ROW_H }]}>
        <Text style={styles.semesterText}>{settings.semester}</Text>
      </View>

      {/* 曜日ヘッダー行 */}
      <View style={[styles.headerRow, { height: HEADER_ROW_H }]}>
        <View style={[styles.periodHeaderCell, { width: PERIOD_COL_W }]} />
        {dayIndices.map(di => (
          <View key={di} style={[styles.dayHeaderCell, { width: cellWidth }]}>
            <Text style={[styles.dayText, { color: ALL_DAY_COLORS[di] }]}>
              {ALL_DAYS[di]}
            </Text>
          </View>
        ))}
      </View>

      {/* 時限行（残り全高を均等分割） */}
      <View style={styles.periodsContainer}>
        {periods.map(period => {
          const pIdx = period - 1;
          const timeInfo = settings.periodTimes[pIdx];
          return (
            <View key={period} style={styles.periodRow}>
              {/* 限数 + 時間ラベル */}
              <View style={[styles.periodCell, { width: PERIOD_COL_W }]}>
                <Text style={styles.periodNumber}>{period}</Text>
                {timeInfo && (
                  <>
                    <Text style={styles.periodTimeText}>{timeInfo.start}</Text>
                    <Text style={styles.periodTimeText}>{timeInfo.end}</Text>
                  </>
                )}
              </View>

              {/* 各曜日セル */}
              {dayIndices.map(di => {
                const day = di as DayOfWeek;
                const cls = getClass(day, period);
                return (
                  <TouchableOpacity
                    key={di}
                    activeOpacity={0.6}
                    style={[
                      styles.cell,
                      { width: cellWidth },
                      cls ? styles.cellFilled : styles.cellEmpty,
                    ]}
                    onPress={() => onCellPress(day, period, cls)}
                  >
                    {cls ? (
                      <View style={[styles.classInner, { borderLeftColor: ALL_DAY_COLORS[di] }]}>
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
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  semesterBanner: {
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  semesterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },

  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  periodHeaderCell: {
    backgroundColor: '#F2F2F7',
    borderRightWidth: 0.5,
    borderRightColor: '#C6C6C8',
  },
  dayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
    borderLeftWidth: 0.5,
    borderLeftColor: '#C6C6C8',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
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
    paddingVertical: 2,
    gap: 1,
  },
  periodNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3C3C43',
  },
  periodTimeText: {
    fontSize: 8,
    color: '#8E8E93',
    letterSpacing: -0.2,
  },

  cell: {
    flex: 1,
    borderLeftWidth: 0.5,
    borderLeftColor: '#E5E5EA',
    padding: 3,
    overflow: 'hidden',
  },
  cellFilled: {
    backgroundColor: '#FFFFFF',
  },
  cellEmpty: {
    backgroundColor: '#F2F2F7',
  },

  classInner: {
    flex: 1,
    borderLeftWidth: 3,
    paddingLeft: 4,
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
