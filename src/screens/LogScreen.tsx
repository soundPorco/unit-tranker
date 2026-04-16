import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
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
  '#90DBA6',
  '#4DBD70',
  '#25A84E',
  '#167535',
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
  const [helpVisible, setHelpVisible] = useState(false);
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

  // 記録開始からの経過日数
  const elapsedDays = useMemo(() => {
    if (!firstDate) return 0;
    return Math.floor((today.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }, [firstDate, today]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>ログ</Text>
        </View>
        <View style={styles.headerSide}>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => setHelpVisible(true)}>
            <Ionicons name="help-circle-outline" size={22} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ヘルプモーダル */}
      <Modal
        visible={helpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHelpVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setHelpVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>ログ画面について</Text>
            <View style={styles.modalDivider} />
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>アクティビティグラフ</Text>
              <Text style={styles.modalBody}>
                出席・課題の活動量を日ごとのマスで可視化します。色が濃いほどその日の活動量が多いことを示します。
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>記録開始カード</Text>
              <Text style={styles.modalBody}>
                最初に活動を記録した日からの経過日数を表示します。積み上げてきた日数を確認できます。
              </Text>
            </View>
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>サマリー</Text>
              <Text style={styles.modalBody}>
                <Text style={styles.bold}>活動日数</Text>：記録がある日の合計{'\n'}
                <Text style={styles.bold}>出席スコア</Text>：出席記録の合計ポイント{'\n'}
                <Text style={styles.bold}>課題提出</Text>：提出した課題の合計件数
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setHelpVisible(false)}>
              <Text style={styles.modalCloseText}>閉じる</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

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
          {/* 記録開始カード */}
          {firstDate && (
            <View style={styles.sinceCard}>
              <View>
                <Text style={styles.sinceDate}>
                  {firstDate.getFullYear()}/{firstDate.getMonth() + 1}/{firstDate.getDate()} から記録中
                </Text>
                <Text style={styles.sinceDays}>{elapsedDays}日目</Text>
              </View>
              <Ionicons name="calendar-outline" size={32} color="rgba(255,255,255,0.7)" />
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
                    if (ds > todayStr) {
                      return <View key={di} style={styles.cellEmpty} />;
                    }
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

  // 記録開始カード
  sinceCard: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sinceDate: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  sinceDays: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
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
  cellEmpty: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginRight: CELL_GAP,
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

  // ヘルプモーダル
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
  },
  modalDivider: {
    height: 0.5,
    backgroundColor: '#E0E0E0',
  },
  modalSection: {
    gap: 4,
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
  modalBody: {
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalCloseButton: {
    marginTop: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});
