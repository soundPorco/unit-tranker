import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAssignments } from '../hooks/useAssignments';
import { Assignment } from '../types';

const today = new Date().toISOString().slice(0, 10);

export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<string | null>(today);
  const { assignments, loading, refetch } = useAssignments();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // 課題日付 → カレンダーマーキング
  const markedDates: Record<string, any> = {};
  assignments.forEach(a => {
    const existing = markedDates[a.due_date];
    markedDates[a.due_date] = {
      dots: [
        ...(existing?.dots ?? []),
        { color: a.is_submitted ? '#C7C7CC' : '#FF3B30' },
      ].slice(0, 3),
      selected: selectedDate === a.due_date,
      selectedColor: '#007AFF',
    };
  });
  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: '#007AFF' };
  }

  const selectedAssignments = selectedDate
    ? assignments.filter(a => a.due_date === selectedDate)
    : [];

  const pendingCount = selectedAssignments.filter(a => !a.is_submitted).length;

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* ヘッダー */}
      <View style={s.header}>
        <Text style={s.title}>カレンダー</Text>
      </View>

      {/* カレンダー本体 */}
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        style={s.calendar}
        theme={{
          backgroundColor:           '#FFFFFF',
          calendarBackground:        '#FFFFFF',
          todayTextColor:            '#007AFF',
          todayBackgroundColor:      '#E8F1FF',
          selectedDayBackgroundColor:'#007AFF',
          selectedDayTextColor:      '#FFFFFF',
          arrowColor:                '#007AFF',
          dotColor:                  '#FF3B30',
          textDayFontSize:           15,
          textDayFontWeight:         '400',
          textMonthFontSize:         16,
          textMonthFontWeight:       '700',
          textDayHeaderFontSize:     12,
          textDayHeaderFontWeight:   '600',
          dayTextColor:              '#1C1C1E',
          textDisabledColor:         '#C7C7CC',
          monthTextColor:            '#1C1C1E',
        }}
      />

      {/* 凡例 */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#FF3B30' }]} />
          <Text style={s.legendText}>未提出の課題</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#C7C7CC' }]} />
          <Text style={s.legendText}>提出済み</Text>
        </View>
      </View>

      {/* 区切り */}
      <View style={s.separator} />

      {/* 選択日の課題一覧 */}
      <View style={s.listArea}>
        <View style={s.listHeader}>
          <Text style={s.listTitle}>
            {selectedDate
              ? `${selectedDate.replace(/-/g, '/')} の課題`
              : '日付を選択してください'}
          </Text>
          {pendingCount > 0 && (
            <View style={s.pendingBadge}>
              <Text style={s.pendingBadgeText}>未提出 {pendingCount}</Text>
            </View>
          )}
        </View>

        {!selectedDate ? null : selectedAssignments.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#C7C7CC" />
            <Text style={s.emptyText}>課題なし</Text>
          </View>
        ) : (
          <FlatList
            data={selectedAssignments}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <AssignmentRow
                item={item}
                isLast={index === selectedAssignments.length - 1}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function AssignmentRow({ item, isLast }: { item: Assignment; isLast: boolean }) {
  const isOverdue = !item.is_submitted && item.due_date < today;

  return (
    <View style={[s.row, !isLast && s.rowBorder]}>
      <View style={[
        s.rowDot,
        { backgroundColor: item.is_submitted ? '#C7C7CC' : isOverdue ? '#FF3B30' : '#FF3B30' },
      ]} />
      <View style={s.rowBody}>
        <Text style={[s.rowTitle, item.is_submitted && s.rowTitleDone]} numberOfLines={1}>
          {item.title}
        </Text>
      </View>
      {item.is_submitted && (
        <View style={s.submittedTag}>
          <Text style={s.submittedTagText}>提出済</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', letterSpacing: 0.3 },

  calendar: {
    borderBottomWidth: 0,
  },

  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#8E8E93' },

  separator: { height: 0.5, backgroundColor: '#E5E5EA' },

  listArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  listTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  pendingBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pendingBadgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingTop: 24, gap: 6 },
  emptyText: { fontSize: 14, color: '#C7C7CC' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 15, color: '#1C1C1E', fontWeight: '400' },
  rowTitleDone: { color: '#C7C7CC', textDecorationLine: 'line-through' },

  submittedTag: {
    backgroundColor: '#F2F2F7',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  submittedTagText: { fontSize: 11, color: '#8E8E93', fontWeight: '500' },
});
