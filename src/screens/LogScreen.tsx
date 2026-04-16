import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActivityLog } from '../hooks/useActivityLog';

// --- 定数 ---
const CELL_SIZE = 36;
const CELL_GAP = 4;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const MONTH_LABEL_WIDTH = 30;

const LEVEL_COLORS = [
  '#EBEBEB',
  '#B7DFBB',
  '#74C07A',
  '#3DA844',
  '#1C7A2E',
] as const;

// --- ヘルパー ---
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildGrid(today: Date, firstDate: Date | null): Date[][] {
  const endSat = new Date(today);
  endSat.setDate(today.getDate() + (6 - today.getDay()));

  const start = firstDate ? new Date(firstDate) : new Date(today);
  start.setDate(start.getDate() - start.getDay());

  const weeks =
    Math.ceil((endSat.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

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
  const totalAttendance = Object.values(activityMap).reduce((s, v) => s + v.score, 0);
  const totalAssignments = Object.values(activityMap).reduce((s, v) => s + v.assignmentCount, 0);

  // 連続記録日数（今日から遡る）
  const streak = useMemo(() => {
    let count = 0;
    const cursor = new Date(today);
    while (true) {
      const ds = toDateString(cursor);
      if (!activityMap[ds]) break;
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [activityMap, today]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ログ</Text>
          {firstDate && (
            <Text style={styles.headerSubtitle}>
              {firstDate.getFullYear()}/{firstDate.getMonth() + 1}/{firstDate.getDate()} から記録中
            </Text>
          )}
        </View>
        <View style={styles.headerSide}>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="help-circle-outline" size={22} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#007AFF" />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollBg}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ストリーク */}
          {streak > 0 && (
            <View style={styles.streakCard}>
              <Text style={styles.streakNumber}>{streak}</Text>
              <Text style={styles.streakLabel}>日連続</Text>
            </View>
          )}

          {/* サマリー */}
          <View style={styles.statsRow}>
            <StatCard label="活動日数" value={String(totalDays)} unit="日" />
            <StatCard label="出席スコア" value={String(totalAttendance)} unit="pt" />
            <StatCard label="課題提出" value={String(totalAssignments)} unit="件" />
          </View>

          {/* グラフ */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>アクティビティ</Text>

            {/* 曜日ヘッダー */}
            <View style={styles.dayHeader}>
              <View style={{ width: MONTH_LABEL_WIDTH }} />
              {DAY_LABELS.map((label) => (
                <Text key={label} style={styles.dayHeaderLabel}>{label}</Text>
              ))}
            </View>

            {/* 週行 */}
            {grid.map((row, wi) => {
              const firstOfRow = row[0];
              const prev = wi > 0 ? grid[wi - 1][0] : null;
              const showMonth =
                wi === 0 || (prev && firstOfRow.getMonth() !== prev.getMonth());
              const monthLabel = showMonth ? `${firstOfRow.getMonth() + 1}月` : null;

              return (
                <View key={wi} style={styles.weekRow}>
                  <Text style={styles.monthLabel}>{monthLabel ?? ''}</Text>
                  {row.map((date, di) => {
                    const ds = toDateString(date);
                    const level = activityMap[ds]?.level ?? 0;
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

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '400',
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBg: {
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 12,
  },

  // タイトル
  titleArea: {
    paddingTop: 4,
    paddingBottom: 4,
    gap: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '400',
  },

  // ストリーク
  streakCard: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  streakLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },

  // サマリー
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },

  // グラフカード
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // 曜日ヘッダー
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayHeaderLabel: {
    width: CELL_SIZE,
    marginRight: CELL_GAP,
    fontSize: 11,
    color: '#C7C7CC',
    textAlign: 'center',
    fontWeight: '500',
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
    color: '#C7C7CC',
    fontWeight: '500',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 6,
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
    marginTop: 12,
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#C7C7CC',
    fontWeight: '500',
  },
  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
});
