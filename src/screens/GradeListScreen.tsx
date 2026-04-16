import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, SectionList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, TouchableWithoutFeedback, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useClasses } from '../hooks/useClasses';
import { useTimetables } from '../hooks/useTimetables';
import { GradeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<GradeStackParamList, 'GradeList'>;

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const DAY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF6B6B'];

export function GradeListScreen() {
  const navigation = useNavigation<Nav>();

  const [currentTimetableId, setCurrentTimetableId] = useState<string | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const { timetables, loaded, reload } = useTimetables();
  const { classes, loading, refetch } = useClasses(currentTimetableId ?? '');

  // 初回ロード時に先頭の時間割を選択
  useEffect(() => {
    if (loaded && currentTimetableId === null && timetables.length > 0) {
      setCurrentTimetableId(timetables[0].id);
    }
  }, [loaded, timetables, currentTimetableId]);

  useFocusEffect(useCallback(() => {
    reload();
    refetch();
  }, [reload, refetch]));

  const currentTimetable = timetables.find(t => t.id === currentTimetableId);
  const currentLabel = currentTimetable
    ? `${currentTimetable.academicYear}年度 ${currentTimetable.semester}`
    : '成績';

  const sections = useMemo(() => {
    return DAYS.map((day, index) => ({
      day,
      dayIndex: index,
      color: DAY_COLORS[index],
      data: classes
        .filter(c => c.day_of_week === index)
        .sort((a, b) => a.period - b.period),
    })).filter(s => s.data.length > 0);
  }, [classes]);

  if (loading || !loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.customHeader}>
            <View style={styles.headerSide} />
            <View style={styles.switcherBtn}>
              <Text style={styles.headerTitle}>{currentLabel}</Text>
            </View>
            <View style={styles.headerSide} />
          </View>
        </SafeAreaView>
        <View style={styles.headerDivider} />
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  // 時間割がない場合
  if (timetables.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
          <View style={styles.customHeader}>
            <View style={styles.headerSide} />
            <View style={styles.switcherBtn}>
              <Text style={styles.headerTitle}>成績</Text>
            </View>
            <View style={styles.headerSide} />
          </View>
        </SafeAreaView>
        <View style={styles.headerDivider} />
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>時間割がありません</Text>
          <Text style={styles.emptyDesc}>時間割タブから追加しましょう</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* カスタムヘッダー */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.customHeader}>
          <View style={styles.headerSide} />

          {/* 時間割切り替えボタン */}
          <TouchableOpacity
            style={styles.switcherBtn}
            onPress={() => setShowSwitcher(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>{currentLabel}</Text>
            <Ionicons
              name={showSwitcher ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#8E8E93"
            />
          </TouchableOpacity>

          <View style={styles.headerSide} />
        </View>
        <Text style={styles.headerSubtitle}>{classes.length} 科目</Text>
      </SafeAreaView>
      <View style={styles.headerDivider} />

      {classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>科目が登録されていません</Text>
          <Text style={styles.emptyDesc}>時間割から科目を追加しましょう</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
              <Text style={[styles.sectionTitle, { color: section.color }]}>
                {section.day}曜日
              </Text>
            </View>
          )}
          renderItem={({ item, section }) => {
            const color = section.color;
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ClassDetail', {
                  classId: item.id,
                  className: item.name,
                })}
              >
                <View style={[styles.stripe, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardTop}>
                    <Text style={styles.className} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.period, { color }]}>{item.period}限</Text>
                  </View>
                  {item.teacher ? (
                    <Text style={styles.teacher}>{item.teacher}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#C7C7CC" style={styles.chevron} />
              </TouchableOpacity>
            );
          }}
          SectionSeparatorComponent={() => <View style={{ height: 4 }} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* 時間割切り替えモーダル */}
      <Modal visible={showSwitcher} transparent animationType="slide" onRequestClose={() => setShowSwitcher(false)}>
        <TouchableWithoutFeedback onPress={() => setShowSwitcher(false)}>
          <View style={sw.overlay}>
            <TouchableWithoutFeedback>
              <View style={sw.sheet}>
                <View style={sw.handle} />
                <View style={sw.sheetHeader}>
                  <Text style={sw.sheetTitle}>時間割を選択</Text>
                </View>
                <FlatList
                  data={timetables}
                  keyExtractor={item => item.id}
                  scrollEnabled={timetables.length > 6}
                  ItemSeparatorComponent={() => <View style={sw.sep} />}
                  renderItem={({ item }) => {
                    const label = `${item.academicYear}年度 ${item.semester}`;
                    const active = item.id === currentTimetableId;
                    return (
                      <TouchableOpacity
                        style={sw.row}
                        activeOpacity={0.6}
                        onPress={() => {
                          setCurrentTimetableId(item.id);
                          setShowSwitcher(false);
                        }}
                      >
                        <View style={[sw.radio, active && sw.radioActive]}>
                          {active && <View style={sw.radioDot} />}
                        </View>
                        <Text style={[sw.label, active && sw.labelActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  headerSafeArea: { backgroundColor: '#FFFFFF' },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
  },
  headerSide: { width: 44 },
  switcherBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  headerTitle: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 12, color: '#8E8E93', textAlign: 'center', paddingBottom: 6 },
  headerDivider: { height: 0.5, backgroundColor: '#E5E5EA' },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3C3C43', marginTop: 8 },
  emptyDesc: { fontSize: 14, color: '#8E8E93' },

  list: { paddingHorizontal: 16, paddingBottom: 24 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stripe: { width: 4 },
  cardContent: { flex: 1, padding: 14, gap: 4 },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  className: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', flex: 1 },
  period: { fontSize: 13, fontWeight: '600' },
  teacher: { fontSize: 12, color: '#8E8E93' },
  chevron: { alignSelf: 'center', marginRight: 10 },
});

const sw = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '40%',
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C7C7CC',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: '#007AFF' },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  sep: {
    height: 0.5,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 20,
  },
  label: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  labelActive: { color: '#007AFF', fontWeight: '600' },
});
