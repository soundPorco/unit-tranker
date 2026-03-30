import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { useAssignments } from '../hooks/useAssignments';
import { Assignment } from '../types';

export function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { assignments, loading, refetch } = useAssignments();

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  // 課題の日付 → マーキング用データ
  const markedDates: Record<string, any> = {};
  assignments.forEach(a => {
    const existing = markedDates[a.due_date];
    markedDates[a.due_date] = {
      dots: [...(existing?.dots ?? []), { color: a.is_submitted ? '#94a3b8' : '#ef4444' }].slice(0, 3),
      selected: selectedDate === a.due_date,
      selectedColor: '#6366f1',
    };
  });
  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: '#6366f1' };
  }

  const selectedAssignments = selectedDate
    ? assignments.filter(a => a.due_date === selectedDate)
    : [];

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#6366f1" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>カレンダー</Text>
      </View>

      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
        theme={{
          todayTextColor: '#6366f1',
          selectedDayBackgroundColor: '#6366f1',
          dotColor: '#ef4444',
          arrowColor: '#6366f1',
          textDayFontWeight: '500',
        }}
      />

      <View style={styles.legend}>
        <View style={styles.dot} />
        <Text style={styles.legendText}>課題の締切</Text>
      </View>

      {selectedDate && (
        <View style={styles.listArea}>
          <Text style={styles.selectedDate}>{selectedDate} の課題</Text>
          {selectedAssignments.length === 0 ? (
            <Text style={styles.empty}>課題なし</Text>
          ) : (
            <FlatList
              data={selectedAssignments}
              keyExtractor={item => item.id}
              renderItem={({ item }) => <AssignmentRow item={item} />}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function AssignmentRow({ item }: { item: Assignment }) {
  return (
    <View style={styles.row}>
      <View style={[styles.rowDot, { backgroundColor: item.is_submitted ? '#94a3b8' : '#ef4444' }]} />
      <Text style={[styles.rowTitle, item.is_submitted && styles.submitted]}>{item.title}</Text>
      {item.is_submitted && <Text style={styles.submittedTag}>提出済</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  legendText: { fontSize: 12, color: '#64748b' },
  listArea: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  selectedDate: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
  empty: { color: '#94a3b8', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f5f9',
  },
  rowDot: { width: 8, height: 8, borderRadius: 4 },
  rowTitle: { flex: 1, fontSize: 14, color: '#1e293b' },
  submitted: { color: '#94a3b8', textDecorationLine: 'line-through' },
  submittedTag: {
    fontSize: 11,
    color: '#94a3b8',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
