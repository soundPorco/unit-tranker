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
const CELL_SIZE = 34;
const CELL_GAP = 4;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const LEVEL_COLORS = ['#EBEDF0', '#9BE9A8', '#40C463', '#216E39'] as const;

const MONTH_LABEL_WIDTH = 32;

// --- ヘルパー ---
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * firstDate〜今週末までの日付グリッドを生成
 * 返り値: rows[week][day]  day 0=日〜6=土
 * 最後の行が今週（最新）
 */
function buildGrid(today: Date, firstDate: Date | null): Date[][] {
  // 今週の土曜日
  const endSat = new Date(today);
  endSat.setDate(today.getDate() + (6 - today.getDay()));

  // 開始週の日曜日（firstDate がある週の日曜日、なければ今週）
  const start = firstDate ? new Date(firstDate) : new Date(today);
  start.setDate(start.getDate() - start.getDay()); // その週の日曜日へ

  const weeks = Math.ceil((endSat.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const rows: Date[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const row: Date[] = [];
    for (let d = 0; d <= 6; d++) {
      const date = new Date(endSat);
      date.setDate(endSat.getDate() - w * 7 - (6 - d));
      row.push(date);
    }
    rows.push(row);
  }
  return rows;
}

// --- コンポーネント ---
export function LogScreen() {
  const { activityMap, loading } = useActivityLog();
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => toDateString(today), [today]);

  const firstDate = useMemo(() => {
    const dates = Object.keys(activityMap).sort();
    return dates.length > 0 ? new Date(dates[0]) : null;
  }, [activityMap]);

  const grid = useMemo(() => buildGrid(today, firstDate), [today, firstDate]);

  const totalDays = Object.keys(activityMap).length;
  const totalAttendance = Object.values(activityMap).reduce((s, v) => s + v.attendanceCount, 0);
  const totalAssignments = Object.values(activityMap).reduce((s, v) => s + v.assignmentCount, 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

          {/* グラフカード */}
          <View style={styles.graphCard}>
            {/* 曜日ヘッダー */}
            <View style={styles.dayHeader}>
              <View style={{ width: MONTH_LABEL_WIDTH }} />
              {DAY_LABELS.map((label) => (
                <Text key={label} style={styles.dayHeaderLabel}>{label}</Text>
              ))}
            </View>

            {/* 週行 */}
            {grid.map((row, wi) => {
              // 月ラベル: その行の最初の日が月初めに変わるとき表示
              const firstDate = row[0];
              const prevFirstDate = wi > 0 ? grid[wi - 1][0] : null;
              const showMonth =
                wi === 0 ||
                (prevFirstDate && firstDate.getMonth() !== prevFirstDate.getMonth());
              const monthLabel = showMonth ? `${firstDate.getMonth() + 1}月` : null;

              return (
                <View key={wi} style={styles.weekRow}>
                  {/* 月ラベル */}
                  <Text style={styles.monthLabel}>{monthLabel ?? ''}</Text>

                  {/* セル */}
                  {row.map((date, di) => {
                    const ds = toDateString(date);
                    const activity = activityMap[ds];
                    const level = activity?.level ?? 0;
                    const isToday = ds === todayStr;
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
              );
            })}

            {/* 凡例 */}
            <View style={styles.legend}>
              <Text style={styles.legendText}>少ない</Text>
              {LEVEL_COLORS.map((color, i) => (
                <View key={i} style={[styles.legendCell, { backgroundColor: color }]} />
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
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayHeaderLabel: {
    width: CELL_SIZE,
    marginRight: CELL_GAP,
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
  },

  // 週行
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CELL_GAP,
  },
  monthLabel: {
    width: MONTH_LABEL_WIDTH,
    fontSize: 10,
    color: '#8E8E93',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 4,
    marginRight: CELL_GAP,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },

  // 凡例
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#8E8E93',
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
});
