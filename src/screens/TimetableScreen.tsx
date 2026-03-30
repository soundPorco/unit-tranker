import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TimetableGrid } from '../components/TimetableGrid';
import { useClasses } from '../hooks/useClasses';
import { TimetableStackParamList, DayOfWeek, Period, Class } from '../types';

type Nav = NativeStackNavigationProp<TimetableStackParamList, 'TimetableMain'>;

export function TimetableScreen() {
  const navigation = useNavigation<Nav>();
  const { classes, loading } = useClasses();

  const handleCellPress = (day: DayOfWeek, period: Period, existing?: Class) => {
    navigation.navigate('ClassForm', { classData: existing, day, period });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>時間割</Text>
      </View>
      <View style={styles.grid}>
        <TimetableGrid classes={classes} onCellPress={handleCellPress} />
      </View>
      <Text style={styles.hint}>コマをタップして講義を登録</Text>
    </SafeAreaView>
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
  grid: { flex: 1, padding: 8 },
  hint: { textAlign: 'center', color: '#94a3b8', fontSize: 12, paddingBottom: 12 },
});
