import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Modal, TouchableWithoutFeedback, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useClasses } from '../hooks/useClasses';
import { useTimetables } from '../hooks/useTimetables';
import { useAllClassStats } from '../hooks/useAllClassStats';
import { GradeStackParamList } from '../types';
import { ActivityGraphCard } from './LogScreen';

type Nav = NativeStackNavigationProp<GradeStackParamList, 'GradeList'>;

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];
const CLASS_COLOR = '#007AFF';
const CLASS_TYPE_SHORT: Record<string, string> = {
  required: '必修',
  elective_required: '選択必修',
  elective: '選択',
};

export function GradeListScreen() {
  const navigation = useNavigation<Nav>();
  const [currentTimetableId, setCurrentTimetableId] = useState<string | null>(null);
  const [showSwitcher, setShowSwitcher] = useState(false);

  const { timetables, loaded, reload } = useTimetables();
  const { classes, loading: classesLoading, refetch } = useClasses(currentTimetableId ?? '');
  const classIds = useMemo(() => classes.map(c => c.id), [classes]);
  const { stats, loading: statsLoading } = useAllClassStats(classIds);

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

  const sortedClasses = useMemo(() =>
    [...classes].sort((a, b) =>
      a.day_of_week !== b.day_of_week
        ? a.day_of_week - b.day_of_week
        : a.period - b.period
    ), [classes]);

  const classesByDay = useMemo(() => {
    const map = new Map<number, typeof classes>();
    sortedClasses.forEach(cls => {
      const day = cls.day_of_week;
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(cls);
    });
    return map;
  }, [sortedClasses]);

  const dayKeys = useMemo(() => Array.from(classesByDay.keys()).sort((a, b) => a - b), [classesByDay]);

  const [activityExpanded, setActivityExpanded] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());

  const toggleDay = useCallback((day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }, []);

  const summary = useMemo(() => {
    const totalCredits = classes.reduce((s, c) => s + (c.credits ?? 0), 0);
    const creditClasses = classes.filter(c => c.credits != null).length;
    const rates = Object.values(stats).map(s => s.attendanceRate);
    const avgAtt = rates.length > 0
      ? Math.round(rates.reduce((s, r) => s + r, 0) / rates.length)
      : null;
    return { totalCredits, creditClasses, avgAtt };
  }, [classes, stats]);

  const loading = !loaded || classesLoading;

  // --- ヘッダー ---
  const renderHeader = (interactive = true) => (
    <SafeAreaView edges={['top']} style={s.headerSafeArea}>
      <View style={s.headerRow}>
        <View style={s.headerSide} />
        {interactive && timetables.length > 0 ? (
          <TouchableOpacity
            style={s.switcherBtn}
            onPress={() => setShowSwitcher(true)}
            activeOpacity={0.7}
          >
            <Text style={s.headerTitle} numberOfLines={1}>{currentLabel}</Text>
            <Ionicons
              name={showSwitcher ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#8E8E93"
            />
          </TouchableOpacity>
        ) : (
          <View style={s.switcherBtn}>
            <Text style={s.headerTitle}>成績</Text>
          </View>
        )}
        <View style={s.headerSide} />
      </View>
    </SafeAreaView>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        {renderHeader(false)}
        <View style={s.divider} />
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (timetables.length === 0) {
    return (
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        {renderHeader(false)}
        <View style={s.divider} />
        <View style={s.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#C7C7CC" />
          <Text style={s.emptyTitle}>時間割がありません</Text>
          <Text style={s.emptyDesc}>時間割タブから追加しましょう</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      {renderHeader()}
      <View style={s.divider} />

      <ScrollView
        style={s.scrollBg}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* サマリーカード */}
        <View style={s.summaryRow}>
          <SummaryCard
            icon="book-outline"
            label="登録科目"
            value={String(classes.length)}
            unit="科目"
          />
          <SummaryCard
            icon="school-outline"
            label="合計単位"
            value={String(summary.totalCredits)}
            unit="単位"
            sub={summary.creditClasses < classes.length
              ? `${classes.length - summary.creditClasses}科目未設定`
              : undefined}
          />
          <SummaryCard
            icon="person-outline"
            label="平均出席率"
            value={summary.avgAtt != null ? String(summary.avgAtt) : '—'}
            unit={summary.avgAtt != null ? '%' : ''}
          />
        </View>

        {/* アクティビティグラフ（アコーディオン） */}
        <View style={s.activitySection}>
          <TouchableOpacity
            style={s.activityHeader}
            activeOpacity={0.7}
            onPress={() => setActivityExpanded(prev => !prev)}
          >
            <View style={s.activityHeaderLeft}>
              <Ionicons name="pulse-outline" size={16} color="#007AFF" />
              <Text style={s.activityHeaderLabel}>アクティビティ</Text>
            </View>
            <Ionicons
              name={activityExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#8E8E93"
            />
          </TouchableOpacity>
          {activityExpanded && <ActivityGraphCard />}
        </View>

        {/* 科目別リスト */}
        {classes.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="book-outline" size={40} color="#C7C7CC" />
            <Text style={s.emptyTitle}>科目が登録されていません</Text>
            <Text style={s.emptyDesc}>時間割から科目を追加しましょう</Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionLabel}>科目別</Text>
            {dayKeys.map(day => {
              const dayClasses = classesByDay.get(day) ?? [];
              const isExpanded = expandedDays.has(day);
              return (
                <View key={day} style={s.accordionSection}>
                  <TouchableOpacity
                    style={s.accordionHeader}
                    activeOpacity={0.7}
                    onPress={() => toggleDay(day)}
                  >
                    <View style={s.accordionHeaderLeft}>
                      <View style={s.dayBadge}>
                        <Text style={s.dayBadgeText}>{DAYS[day]}</Text>
                      </View>
                      <Text style={s.accordionHeaderCount}>{dayClasses.length}科目</Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>

                  {isExpanded && dayClasses.map((cls, idx) => {
                    const color = CLASS_COLOR;
                    const stat = stats[cls.id];
                    const attRate = stat?.attendanceRate ?? 0;
                    const submRate = stat?.submissionRate ?? 0;
                    const meta = [
                      `${cls.period}限`,
                      cls.credits != null ? `${cls.credits}単位` : null,
                      cls.class_type ? CLASS_TYPE_SHORT[cls.class_type] : null,
                    ].filter(Boolean).join(' · ');

                    return (
                      <TouchableOpacity
                        key={cls.id}
                        style={[
                          s.innerClassCard,
                          idx < dayClasses.length - 1 && s.innerClassCardDivider,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('ClassDetail', {
                          classId: cls.id,
                          className: cls.name,
                        })}
                      >
                        <View style={[s.stripe, { backgroundColor: color }]} />
                        <View style={s.classBody}>
                          <View style={s.classTop}>
                            <Text style={s.className} numberOfLines={1}>{cls.name}</Text>
                            <Ionicons name="chevron-forward" size={14} color="#C7C7CC" />
                          </View>
                          <Text style={s.classMeta}>{meta}</Text>
                          {statsLoading ? (
                            <View style={s.barSkeleton} />
                          ) : (
                            <View style={s.barRow}>
                              <Text style={s.barLabel}>出席</Text>
                              <View style={s.track}>
                                <View style={[s.fill, { width: `${attRate}%` as any, backgroundColor: color }]} />
                              </View>
                              <Text style={[s.barPct, { color: attRate > 0 ? color : '#C7C7CC' }]}>
                                {attRate > 0 ? `${attRate}%` : '—'}
                              </Text>
                            </View>
                          )}
                          {!statsLoading && submRate > 0 && (
                            <View style={s.barRow}>
                              <Text style={s.barLabel}>課題</Text>
                              <View style={s.track}>
                                <View style={[s.fill, { width: `${submRate}%` as any, backgroundColor: '#8E8E93' }]} />
                              </View>
                              <Text style={[s.barPct, { color: '#8E8E93' }]}>{submRate}%</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* 時間割切り替えモーダル */}
      <Modal
        visible={showSwitcher}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSwitcher(false)}
      >
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

// --- サマリーカード ---
function SummaryCard({
  icon, label, value, unit, sub,
}: {
  icon: any;
  label: string;
  value: string;
  unit: string;
  sub?: string;
}) {
  return (
    <View style={s.summaryCard}>
      <Ionicons name={icon} size={16} color="#007AFF" />
      <Text style={s.summaryLabel}>{label}</Text>
      <View style={s.summaryValueRow}>
        <Text style={s.summaryValue}>{value}</Text>
        {unit ? <Text style={s.summaryUnit}>{unit}</Text> : null}
      </View>
      {sub ? <Text style={s.summarySub}>{sub}</Text> : null}
    </View>
  );
}

// --- スタイル ---
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  headerSafeArea: { backgroundColor: '#FFFFFF' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
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
  divider: { height: 0.5, backgroundColor: '#E5E5EA' },

  scrollBg: { backgroundColor: '#F2F2F7' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 },

  // サマリー
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryLabel: { fontSize: 12, color: '#6C6C70', fontWeight: '600', marginTop: 2 },
  summaryValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#1C1C1E' },
  summaryUnit: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  summarySub: { fontSize: 10, color: '#C7C7CC' },

  activitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityHeaderLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },

  // セクションラベル
  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6C6C70',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 4,
    marginBottom: -4,
  },

  // 科目カード
  classCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stripe: { width: 4 },
  classBody: { flex: 1, padding: 14, gap: 8 },
  classTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  className: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', flex: 1 },
  classMeta: { fontSize: 12, color: '#8E8E93', marginTop: -4 },

  // バー
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 11, color: '#8E8E93', width: 26, fontWeight: '500' },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  fill: { height: 6, borderRadius: 3 },
  barPct: { fontSize: 12, fontWeight: '600', width: 34, textAlign: 'right' },
  barSkeleton: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F2F2F7',
    marginVertical: 4,
  },

  // アコーディオン
  accordionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  accordionHeaderCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6C6C70',
  },
  innerClassCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
  },
  innerClassCardDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },

  // 空状態
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3C3C43' },
  emptyDesc: { fontSize: 14, color: '#8E8E93' },
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
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#C7C7CC',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  sheetHeader: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  sheetTitle: {
    fontSize: 13, fontWeight: '600', color: '#8E8E93',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#007AFF' },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#007AFF' },
  sep: { height: 0.5, backgroundColor: '#E5E5EA', marginHorizontal: 20 },
  label: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  labelActive: { color: '#007AFF', fontWeight: '600' },
});
