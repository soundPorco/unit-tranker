import React, { useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useClasses } from '../hooks/useClasses';
import { GradeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<GradeStackParamList, 'GradeList'>;
type Route = RouteProp<GradeStackParamList, 'GradeList'>;

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF6B6B'];

export function GradeListScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { timetableId, timetableLabel } = route.params;
  const { classes, loading, refetch } = useClasses(timetableId);

  useFocusEffect(useCallback(() => {
    refetch();
  }, [refetch]));

  // 曜日ごとにグループ化（登録済みの曜日のみ、月〜日順）
  const sections = useMemo(() => {
    return DAYS.map((day, index) => ({
      day,
      dayIndex: index,
      color: DAY_COLORS[index],
      data: classes
        .filter(c => c.day_of_week === index)
        .sort((a, b) => a.period - b.period),
    })).filter(s => s.data.length > 0);
  }, [classes]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>{timetableLabel}</Text>
        <Text style={styles.subtitle}>{classes.length} 科目</Text>
      </View>

      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>科目が登録されていません</Text>
          <Text style={styles.emptyDesc}>時間割から科目を追加しましょう</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
              <Text style={[styles.sectionTitle, { color: section.color }]}>
                {section.day}曜日
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const color = section.color;
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
                  <View style={styles.cardTop}>
                    <Text style={styles.className} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.period, { color }]}>{item.period}限</Text>
                  </View>

                  {item.teacher ? (
                    <Text style={styles.teacher}>{item.teacher}</Text>
                  ) : null}
                </View>

                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" style={styles.chevron} />
              </TouchableOpacity>
            );
          }}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

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
  period: { fontSize: 13, fontWeight: '600' },

  teacher: { fontSize: 12, color: '#8E8E93' },

  chevron: { alignSelf: 'center', marginRight: 10 },
});
