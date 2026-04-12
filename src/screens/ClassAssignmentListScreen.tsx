import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAssignments } from '../hooks/useAssignments';
import { GradeStackParamList, Assignment } from '../types';

type Route = RouteProp<GradeStackParamList, 'AssignmentList'>;

const today = new Date().toISOString().slice(0, 10);

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAY_LABELS[d.getDay()]})`;
}

type Section = {
  title: string;
  color: string;
  dotColor: string;
  items: Assignment[];
};

function buildSections(assignments: Assignment[]): Section[] {
  const overdue:   Assignment[] = [];
  const pending:   Assignment[] = [];
  const submitted: Assignment[] = [];

  for (const a of assignments) {
    if (a.is_submitted) {
      submitted.push(a);
    } else if (a.due_date && a.due_date < today) {
      overdue.push(a);
    } else {
      pending.push(a);
    }
  }

  return ([
    { title: '期限切れ', color: '#FF3B30', dotColor: '#FF3B30', items: overdue   },
    { title: '未提出',   color: '#007AFF', dotColor: '#007AFF', items: pending   },
    { title: '提出済み', color: '#8E8E93', dotColor: '#8E8E93', items: submitted },
  ]).filter(s => s.items.length > 0);
}

export function ClassAssignmentListScreen() {
  const route = useRoute<Route>();
  const { classId } = route.params;

  const { assignments, loading, toggleSubmitted, deleteAssignment } = useAssignments(classId);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const sections = buildSections(assignments);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {assignments.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="document-text-outline" size={36} color="#C7C7CC" />
            <Text style={s.emptyText}>課題がありません</Text>
          </View>
        ) : (
          sections.map(section => (
            <View key={section.title}>
              {/* セクションヘッダー */}
              <View style={s.sectionHeader}>
                <View style={[s.sectionDot, { backgroundColor: section.dotColor }]} />
                <Text style={[s.sectionTitle, { color: section.color }]}>{section.title}</Text>
                <Text style={s.sectionCount}>{section.items.length}件</Text>
              </View>

              {/* カード */}
              <View style={s.card}>
                {section.items.map((item, idx) => {
                  const isOverdue = !item.is_submitted && !!item.due_date && item.due_date < today;
                  const isToday   = !item.is_submitted && item.due_date === today;
                  const dueColor  = item.is_submitted ? '#8E8E93' : isOverdue ? '#FF3B30' : isToday ? '#007AFF' : '#8E8E93';

                  return (
                    <View key={item.id} style={[s.listRow, idx < section.items.length - 1 && s.listRowBorder]}>
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
                        <Text style={[s.itemTitle, item.is_submitted && s.strikethrough]} numberOfLines={2}>
                          {item.title}
                        </Text>
                        {item.due_date ? (
                          <View style={s.dueDateRow}>
                            <Ionicons name="time-outline" size={11} color={dueColor} />
                            <Text style={[s.dueDate, { color: dueColor }]}>
                              {isToday ? '今日 · ' : ''}{formatDate(item.due_date)}
                            </Text>
                          </View>
                        ) : (
                          <Text style={s.noDue}>締切なし</Text>
                        )}
                        {item.memo ? (
                          <Text style={s.memo} numberOfLines={1}>{item.memo}</Text>
                        ) : null}
                      </View>

                      {/* 削除ボタン */}
                      <TouchableOpacity
                        onPress={() => Alert.alert('削除', `「${item.title}」を削除しますか？`, [
                          { text: 'キャンセル', style: 'cancel' },
                          { text: '削除', style: 'destructive', onPress: () => deleteAssignment(item.id) },
                        ])}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#C7C7CC" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  content: { padding: 16, paddingBottom: 40, gap: 6 },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: { fontSize: 14, color: '#C7C7CC' },

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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  listRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },

  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#007AFF', borderColor: '#007AFF' },

  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#1C1C1E', lineHeight: 20 },
  strikethrough: { textDecorationLine: 'line-through', color: '#C7C7CC' },

  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueDate: { fontSize: 12, fontWeight: '500' },
  noDue: { fontSize: 12, color: '#C7C7CC' },
  memo: { fontSize: 12, color: '#8E8E93' },
});
