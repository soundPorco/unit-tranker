import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TimetableGrid } from '../components/TimetableGrid';
import { TimetableSettingsModal } from '../components/TimetableSettingsModal';
import { useClasses } from '../hooks/useClasses';
import { useTimetableSettings } from '../hooks/useTimetableSettings';
import { TimetableStackParamList, DayOfWeek, Period, Class } from '../types';

type Nav = NativeStackNavigationProp<TimetableStackParamList, 'TimetableMain'>;

export function TimetableScreen() {
  const navigation = useNavigation<Nav>();
  const { classes, loading, refetch } = useClasses();
  const { settings, saveSettings, loaded } = useTimetableSettings();
  const [showSettings, setShowSettings] = useState(false);

  useFocusEffect(useCallback(() => {
    refetch();
  }, [refetch]));

  const handleCellPress = (day: DayOfWeek, period: Period, existing?: Class) => {
    navigation.navigate('ClassForm', { classData: existing, day, period });
  };

  if (loading || !loaded) {
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
        <Text style={styles.title}>時間割</Text>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={styles.gearBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* グリッド */}
      <View style={styles.gridContainer}>
        <TimetableGrid
          classes={classes}
          settings={settings}
          onCellPress={handleCellPress}
        />
      </View>

      {/* 設定モーダル */}
      <TimetableSettingsModal
        visible={showSettings}
        settings={settings}
        onSave={saveSettings}
        onClose={() => setShowSettings(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 0.3,
  },
  gearBtn: {
    padding: 4,
  },
  gridContainer: {
    flex: 1,
  },
});
