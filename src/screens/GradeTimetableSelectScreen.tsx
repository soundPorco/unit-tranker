import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTimetables } from '../hooks/useTimetables';
import { GradeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<GradeStackParamList, 'GradeTimetableSelect'>;

const SEMESTER_COLORS: Record<string, string> = {
  '前期': '#007AFF',
  '後期': '#FF9500',
};

export function GradeTimetableSelectScreen() {
  const navigation = useNavigation<Nav>();
  const { timetables, loaded, reload } = useTimetables();

  useFocusEffect(useCallback(() => {
    reload();
  }, [reload]));

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>成績</Text>
        <Text style={styles.subtitle}>時間割を選択</Text>
      </View>

      {timetables.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>時間割がありません</Text>
          <Text style={styles.emptyDesc}>時間割タブから追加しましょう</Text>
        </View>
      ) : (
        <FlatList
          data={timetables}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const label = `${item.academicYear}年度 ${item.semester}`;
            const color = SEMESTER_COLORS[item.semester] ?? '#007AFF';
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('GradeList', {
                  timetableId: item.id,
                  timetableLabel: label,
                })}
              >
                <View style={[styles.iconWrap, { backgroundColor: color + '18' }]}>
                  <Ionicons name="calendar" size={22} color={color} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{label}</Text>
                  <Text style={styles.cardSub}>{item.academicYear}年度</Text>
                </View>
                <View style={[styles.semesterBadge, { backgroundColor: color + '18' }]}>
                  <Text style={[styles.semesterText, { color }]}>{item.semester}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
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
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
  cardSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  semesterBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  semesterText: { fontSize: 12, fontWeight: '600' },
});
