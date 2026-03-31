import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TimetableGrid } from '../components/TimetableGrid';
import { useClasses } from '../hooks/useClasses';
import { TimetableStackParamList, DayOfWeek, Period, Class } from '../types';

type Nav = NativeStackNavigationProp<TimetableStackParamList, 'TimetableMain'>;

export function TimetableScreen() {
  const navigation = useNavigation<Nav>();
  const { classes, loading, refetch } = useClasses();

  useFocusEffect(useCallback(() => {
    refetch();
  }, [refetch]));

  const handleCellPress = (day: DayOfWeek, period: Period, existing?: Class) => {
    navigation.navigate('ClassForm', { classData: existing, day, period });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>時間割</Text>
      </View>
      <View style={styles.gridContainer}>
        <TimetableGrid classes={classes} onCellPress={handleCellPress} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: '#F2F2F7',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 0.3,
  },
  gridContainer: {
    flex: 1,
  },
});
