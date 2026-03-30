import React from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useClasses } from '../hooks/useClasses';
import { GradeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<GradeStackParamList, 'GradeList'>;

const DAYS = ['月', '火', '水', '木', '金', '土'];
const EVAL_LABELS: Record<string, string> = {
  balanced: '総合', attendance: '出席重視', assignment: '課題重視', exam: 'テスト重視',
};

export function GradeListScreen() {
  const navigation = useNavigation<Nav>();
  const { classes, loading } = useClasses();

  if (loading) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color="#6366f1" /></SafeAreaView>;
  }

  if (classes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>成績管理</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.empty}>まず時間割から講義を登録しましょう</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>成績管理</Text>
        <Text style={styles.subtitle}>{classes.length}講義</Text>
      </View>
      <FlatList
        data={classes}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('ClassDetail', { classId: item.id, className: item.name })}
          >
            <View style={styles.cardLeft}>
              <View style={styles.dayBadge}>
                <Text style={styles.dayText}>{DAYS[item.day_of_week]}</Text>
                <Text style={styles.periodText}>{item.period}限</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.className}>{item.name}</Text>
              {item.teacher && <Text style={styles.teacher}>{item.teacher}</Text>}
              <Text style={styles.evalType}>{EVAL_LABELS[item.evaluation_type]}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#94a3b8' },
  list: { padding: 12, gap: 8 },
  empty: { color: '#94a3b8', fontSize: 15 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  cardLeft: {},
  dayBadge: {
    width: 44,
    height: 44,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  periodText: { color: '#c7d2fe', fontSize: 10 },
  cardBody: { flex: 1 },
  className: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  teacher: { fontSize: 12, color: '#64748b', marginTop: 2 },
  evalType: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  arrow: { fontSize: 24, color: '#cbd5e1' },
});
