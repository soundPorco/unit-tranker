import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAllAssignments, AssignmentWithClass } from '../hooks/useAllAssignments';

type Filter = 'all' | 'pending' | 'submitted';

const today = new Date().toISOString().slice(0, 10);

function getWeekEnd() {
  const d = new Date();
  d.setDate(d.getDate() + (7 - d.getDay()));
  return d.toISOString().slice(0, 10);
}

// 課題をセクションに振り分ける
function groupAssignments(list: AssignmentWithClass[]): {
  title: string;
  urgency: 'overdue' | 'today' | 'week' | 'later' | 'done';
  data: AssignmentWithClass[];
}[] {
  const weekEnd = getWeekEnd();

  const overdue:    AssignmentWithClass[] = [];
  const todayList:  AssignmentWithClass[] = [];
  const weekList:   AssignmentWithClass[] = [];
  const laterList:  AssignmentWithClass[] = [];
  const doneList:   AssignmentWithClass[] = [];

  for (const a of list) {
    if (a.is_submitted) {
      doneList.push(a);
    } else if (!a.due_date) {
      laterList.push(a);
    } else if (a.due_date < today) {
      overdue.push(a);
    } else if (a.due_date === today) {
      todayList.push(a);
    } else if (a.due_date <= weekEnd) {
      weekList.push(a);
    } else {
      laterList.push(a);
    }
  }

  return ([
    { title: '期限切れ',  urgency: 'overdue' as const, data: overdue   },
    { title: '今日',      urgency: 'today'   as const, data: todayList },
    { title: '今週',      urgency: 'week'    as const, data: weekList  },
    { title: 'それ以降', urgency: 'later'    as const, data: laterList },
    { title: '提出済み', urgency: 'done'     as const, data: doneList  },
  ]).filter(s => s.data.length > 0);
}

const URGENCY_COLOR: Record<string, string> = {
  overdue: '#FF3B30',
  today:   '#FF9500',
  week:    '#007AFF',
  later:   '#34C759',
  done:    '#8E8E93',
};

const DAY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF6B6B'];

export function AssignmentListScreen() {
  const { assignments, loading, refetch, toggleSubmitted, deleteAssignment } = useAllAssignments();
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const filtered = useMemo(() => {
    if (filter === 'pending')   return assignments.filter(a => !a.is_submitted);
    if (filter === 'submitted') return assignments.filter(a => a.is_submitted);
    return assignments;
  }, [assignments, filter]);

  const sections = useMemo(() => groupAssignments(filtered), [filtered]);

  const pendingCount = assignments.filter(a => !a.is_submitted && (!a.due_date || a.due_date >= today)).length;
  const overdueCount = assignments.filter(a => !a.is_submitted && !!a.due_date && a.due_date < today).length;

  const handleDelete = (item: AssignmentWithClass) => {
    Alert.alert('削除', `「${item.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: () => deleteAssignment(item.id) },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>課題</Text>
          <View style={s.headerSub}>
            {overdueCount > 0 && (
              <View style={s.overduePill}>
                <Text style={s.overduePillText}>期限切れ {overdueCount}件</Text>
              </View>
            )}
            <Text style={s.headerCount}>未提出 {pendingCount}件</Text>
          </View>
        </View>
      </View>

      {/* フィルターチップ */}
      <View style={s.filterRow}>
        {([['all', '全て'], ['pending', '未提出'], ['submitted', '提出済み']] as [Filter, string][]).map(
          ([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[s.chip, filter === key && s.chipActive]}
              onPress={() => setFilter(key)}
            >
              <Text style={[s.chipText, filter === key && s.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* 課題リスト */}
      {sections.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={52} color="#C7C7CC" />
          <Text style={s.emptyTitle}>
            {filter === 'pending' ? 'すべて提出済みです' : '課題がありません'}
          </Text>
          <Text style={s.emptyDesc}>科目詳細から課題を追加できます</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={s.sectionHeader}>
              <View style={[s.sectionDot, { backgroundColor: URGENCY_COLOR[section.urgency] }]} />
              <Text style={[s.sectionTitle, { color: URGENCY_COLOR[section.urgency] }]}>
                {section.title}
              </Text>
              <Text style={s.sectionCount}>{section.data.length}件</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            const isLast = index === section.data.length - 1;
            const dayColor = item.classes?.day_of_week != null
              ? DAY_COLORS[item.classes.day_of_week]
              : '#8E8E93';

            return (
              <View style={[s.card, !isLast && s.cardBorder]}>
                {/* チェックボックス */}
                <TouchableOpacity
                  style={[s.checkbox, item.is_submitted && s.checkboxDone]}
                  onPress={() => toggleSubmitted(item.id, item.is_submitted)}
                >
                  {item.is_submitted && (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  )}
                </TouchableOpacity>

                {/* コンテンツ */}
                <View style={s.itemBody}>
                  <Text
                    style={[s.itemTitle, item.is_submitted && s.itemTitleDone]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <View style={s.itemMeta}>
                    {/* 科目名ピル */}
                    {item.classes && (
                      <View style={[s.classPill, { backgroundColor: dayColor + '18' }]}>
                        <Text style={[s.classPillText, { color: dayColor }]}>
                          {item.classes.name}
                        </Text>
                      </View>
                    )}
                    {/* 締切日 */}
                    {item.due_date && (
                      <View style={s.dueDateRow}>
                        <Ionicons
                          name="time-outline"
                          size={11}
                          color={URGENCY_COLOR[section.urgency]}
                        />
                        <Text style={[s.dueDate, { color: URGENCY_COLOR[section.urgency] }]}>
                          {item.due_date}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* 削除ボタン */}
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#C7C7CC" />
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: 0.3 },
  headerSub: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  overduePill: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  overduePillText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  headerCount: { fontSize: 13, color: '#8E8E93' },

  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
  },
  chipActive: { backgroundColor: '#007AFF' },
  chipText: { fontSize: 13, color: '#3C3C43', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3C3C43', marginTop: 8 },
  emptyDesc:  { fontSize: 14, color: '#8E8E93' },

  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 6 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 2,
  },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  sectionCount: { fontSize: 12, color: '#8E8E93', marginLeft: 2 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
    borderRadius: 0,
  },
  // 最初のカードに上角丸、最後のカードに下角丸を適用するため
  // セクションの先頭・末尾はSectionListのrenderItemで対応
  cardBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },

  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#34C759', borderColor: '#34C759' },

  itemBody: { flex: 1, gap: 5 },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#1C1C1E', lineHeight: 20 },
  itemTitleDone: { textDecorationLine: 'line-through', color: '#C7C7CC' },

  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  classPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  classPillText: { fontSize: 11, fontWeight: '600' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dueDate: { fontSize: 12, fontWeight: '500' },
});
