import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useClasses } from '../hooks/useClasses';
import { useAllClassStats } from '../hooks/useAllClassStats';
import { GradeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<GradeStackParamList, 'GradeList'>;

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF6B6B'];

// 各カードが独立して出席率・提出率を表示するための小コンポーネント
function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${value}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const pb = StyleSheet.create({
  track: { flex: 1, height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, overflow: 'hidden' },
  fill:  { height: 4, borderRadius: 2 },
});

export function GradeListScreen() {
  const navigation = useNavigation<Nav>();
  const { classes, loading, refetch } = useClasses();
  const { stats, refetch: refetchStats } = useAllClassStats(classes.map(c => c.id));

  useFocusEffect(useCallback(() => {
    refetch();
    refetchStats();
  }, [refetch, refetchStats]));

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>成績</Text>
        <Text style={styles.subtitle}>{classes.length} 科目</Text>
      </View>

      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>科目が登録されていません</Text>
          <Text style={styles.emptyDesc}>時間割から科目を追加しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const color = DAY_COLORS[item.day_of_week] ?? '#007AFF';
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ClassDetail', {
                  classId: item.id,
                  className: item.name,
                })}
              >
                {/* 左カラーストライプ */}
                <View style={[styles.stripe, { backgroundColor: color }]} />

                <View style={styles.cardContent}>
                  {/* 上段：科目名 + 曜日バッジ */}
                  <View style={styles.cardTop}>
                    <Text style={styles.className} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.dayPill, { backgroundColor: color + '18' }]}>
                      <Text style={[styles.dayPillText, { color }]}>
                        {DAYS[item.day_of_week]}曜{item.period}限
                      </Text>
                    </View>
                  </View>

                  {/* 教員名 */}
                  {item.teacher ? (
                    <Text style={styles.teacher}>{item.teacher}</Text>
                  ) : null}

                  {/* プログレスバー行 */}
                  {(() => {
                    const s = stats[item.id];
                    const attRate = s?.attendanceRate ?? null;
                    const asgRate = s?.submissionRate ?? null;
                    return (
                      <View style={styles.barsContainer}>
                        <View style={styles.barRow}>
                          <Text style={styles.barLabel}>出席</Text>
                          <ProgressBar value={attRate ?? 0} color={color} />
                          <Text style={styles.barValue}>
                            {attRate !== null ? `${attRate}%` : '—'}
                          </Text>
                        </View>
                        <View style={styles.barRow}>
                          <Text style={styles.barLabel}>課題</Text>
                          <ProgressBar value={asgRate ?? 0} color={color} />
                          <Text style={styles.barValue}>
                            {asgRate !== null ? `${asgRate}%` : '—'}
                          </Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" style={styles.chevron} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: 0.3 },
  subtitle: { fontSize: 15, color: '#8E8E93', fontWeight: '400' },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3C3C43', marginTop: 8 },
  emptyDesc:  { fontSize: 14, color: '#8E8E93' },

  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stripe: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 4 },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  className: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', flex: 1 },
  dayPill: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dayPillText: { fontSize: 11, fontWeight: '600' },

  teacher: { fontSize: 12, color: '#8E8E93' },

  barsContainer: { gap: 5, marginTop: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 11, color: '#8E8E93', width: 24 },
  barValue: { fontSize: 11, color: '#8E8E93', width: 28, textAlign: 'right' },

  chevron: { alignSelf: 'center', marginRight: 10 },
});
