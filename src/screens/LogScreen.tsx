import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivityLog } from '../hooks/useActivityLog';

// --- 定数 ---
const CELL_SIZE = 13;
const CELL_GAP = 3;
const WEEKS = 26; // 表示する週数（約半年）
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const LEVEL_COLORS = ['#EBEDF0', '#9BE9A8', '#40C463', '#216E39'] as const;

// --- ヘルパー ---
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** WEEKS 週分の日付グリッドを生成（列 = 週、行 = 曜日 0=日〜6=土） */
function buildGrid(today: Date): Date[][] {
  // 今日の週の土曜日を最終日にする
  const endSunday = new Date(today);
  endSunday.setDate(today.getDate() + (6 - today.getDay()));

  const cols: Date[][] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const col: Date[] = [];
    for (let d = 0; d <= 6; d++) {
      const date = new Date(endSunday);
      date.setDate(endSunday.getDate() - w * 7 - (6 - d));
      col.push(date);
    }
    cols.push(col);
  }
  return cols;
}

/** 月ラベル（グリッド列ごとに月の変わり目を返す） */
function buildMonthLabels(grid: Date[][]): (string | null)[] {
  return grid.map((col, i) => {
    const month = col[0].getMonth();
    if (i === 0) return `${col[0].getMonth() + 1}月`;
    const prevMonth = grid[i - 1][0].getMonth();
    return month !== prevMonth ? `${month + 1}月` : null;
  });
}

// --- コンポーネント ---
export function LogScreen() {
  const { activityMap, loading } = useActivityLog();
  const today = useMemo(() => new Date(), []);
  const grid = useMemo(() => buildGrid(today), [today]);
  const monthLabels = useMemo(() => buildMonthLabels(grid), [grid]);

  const totalDays = Object.keys(activityMap).length;
  const totalAttendance = Object.values(activityMap).reduce((s, v) => s + v.attendanceCount, 0);
  const totalAssignments = Object.values(activityMap).reduce((s, v) => s + v.assignmentCount, 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ログ</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#007AFF" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* サマリー */}
          <View style={styles.statsRow}>
            <StatCard label="活動日数" value={`${totalDays}日`} />
            <StatCard label="出席" value={`${totalAttendance}回`} />
            <StatCard label="課題提出" value={`${totalAssignments}件`} />
          </View>

          {/* グリッド */}
          <View style={styles.graphCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                {/* 月ラベル */}
                <View style={styles.monthRow}>
                  {monthLabels.map((label, i) => (
                    <View key={i} style={styles.monthCell}>
                      {label ? <Text style={styles.monthText}>{label}</Text> : null}
                    </View>
                  ))}
                </View>

                {/* 曜日ラベル + セルグリッド */}
                <View style={styles.gridBody}>
                  {/* 曜日ラベル */}
                  <View style={styles.dayLabelCol}>
                    {DAY_LABELS.map((label, i) => (
                      <Text key={i} style={styles.dayLabel}>{label}</Text>
                    ))}
                  </View>

                  {/* セル列 */}
                  {grid.map((col, wi) => (
                    <View key={wi} style={styles.weekCol}>
                      {col.map((date, di) => {
                        const ds = toDateString(date);
                        const activity = activityMap[ds];
                        const level = activity?.level ?? 0;
                        const isToday = ds === toDateString(today);
                        return (
                          <View
                            key={di}
                            style={[
                              styles.cell,
                              { backgroundColor: LEVEL_COLORS[level] },
                              isToday && styles.cellToday,
                            ]}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* 凡例 */}
            <View style={styles.legend}>
              <Text style={styles.legendText}>少ない</Text>
              {LEVEL_COLORS.map((color, i) => (
                <View key={i} style={[styles.cell, { backgroundColor: color }]} />
              ))}
              <Text style={styles.legendText}>多い</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },

  // サマリー
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },

  // グラフ
  graphCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
  },
  monthRow: {
    flexDirection: 'row',
    marginLeft: 22,
    marginBottom: 4,
  },
  monthCell: {
    width: CELL_SIZE + CELL_GAP,
  },
  monthText: {
    fontSize: 10,
    color: '#8E8E93',
  },
  gridBody: {
    flexDirection: 'row',
  },
  dayLabelCol: {
    marginRight: 4,
    gap: CELL_GAP,
  },
  dayLabel: {
    fontSize: 10,
    color: '#8E8E93',
    width: 18,
    height: CELL_SIZE,
    lineHeight: CELL_SIZE,
    textAlign: 'right',
  },
  weekCol: {
    marginRight: CELL_GAP,
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: '#007AFF',
  },

  // 凡例
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#8E8E93',
  },
});
