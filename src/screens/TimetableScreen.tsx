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
      {/* ヘッダー：学期テキスト中央 + 右に歯車 */}
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.semesterTitle}>{settings.semester}</Text>
        <View style={styles.headerSide}>
          <TouchableOpacity
            onPress={() => setShowSettings(true)}
            style={styles.gearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
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
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerSide: {
    width: 36,
    alignItems: 'flex-end',
  },
  semesterTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: 0.3,
    textAlign: 'center',
    flex: 1,
  },
  gearBtn: {
    padding: 4,
  },
  gridContainer: {
    flex: 1,
  },
});
