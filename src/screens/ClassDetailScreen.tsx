import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Pressable,
  Animated, Keyboard, Platform,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../hooks/useAttendance';
import { useAssignments } from '../hooks/useAssignments';
import { useTimetables } from '../hooks/useTimetables';
import { supabase } from '../lib/supabase';
import { scheduleAssignmentNotification } from '../lib/notifications';
import { AttendanceButton } from '../components/AttendanceButton';
import { GradeStackParamList, Attendance, AttendanceStatus, Note, Class, ClassType, ExamType } from '../types';

const CLASS_TYPE_LABEL: Record<ClassType, string> = {
  required:          '必修',
  elective_required: '選択必修',
  elective:          '選択',
};

const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  written: '筆記',
  report:  'レポート',
  oral:    '口頭',
  none:    'なし',
};

type Route = RouteProp<GradeStackParamList, 'ClassDetail'>;
type Tab = 'attendance' | 'assignment' | 'note';

const today = new Date().toISOString().slice(0, 10);

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAY_LABELS[d.getDay()]})`;
}

// 出席内訳 横棒グラフ
const ATT_BAR_ITEMS = [
  { key: 'present',   label: '出席', color: '#007AFF', mono: false },
  { key: 'late',      label: '遅刻', color: '#AEAEB2', mono: true  },
  { key: 'absent',    label: '欠席', color: '#8E8E93', mono: true  },
  { key: 'cancelled', label: '休講', color: '#C7C7CC', mono: true  },
] as const;

type AttBarKey = typeof ATT_BAR_ITEMS[number]['key'];
type AttBarStats = Record<AttBarKey, number>;

function AttendanceBarChart({ stats, totalRecords }: { stats: AttBarStats; totalRecords: number }) {
  if (totalRecords === 0) return null;
  return (
    <View style={bc.container}>
      {/* カウント行 */}
      <View style={bc.countRow}>
        <View style={bc.countBlock}>
          <Text style={[bc.countNum, bc.rowCountBlue]}>{stats.present}</Text>
          <Text style={bc.countLbl}>出席</Text>
        </View>
        <View style={bc.countDivider} />
        <View style={bc.countBlock}>
          <Text style={[bc.countNum, bc.rowCountMono]}>{stats.late}</Text>
          <Text style={bc.countLbl}>遅刻</Text>
        </View>
        <View style={bc.countDivider} />
        <View style={bc.countBlock}>
          <Text style={[bc.countNum, bc.rowCountMono]}>{stats.absent}</Text>
          <Text style={bc.countLbl}>欠席</Text>
        </View>
        <View style={bc.countDivider} />
        <View style={bc.countBlock}>
          <Text style={[bc.countNum, bc.rowCountMono]}>{stats.cancelled}</Text>
          <Text style={bc.countLbl}>休講</Text>
        </View>
      </View>
      {/* セパレータ */}
      <View style={bc.separator} />
      {/* 横棒グラフ */}

      {ATT_BAR_ITEMS.map(item => {
        const ratio = totalRecords > 0 ? stats[item.key] / totalRecords : 0;
        return (
          <View key={item.key} style={bc.row}>
            <Text style={bc.rowLabel}>{item.label}</Text>
            <View style={bc.track}>
              <View
                style={[
                  bc.bar,
                  { width: `${ratio * 100}%`, backgroundColor: item.color },
                ]}
              />
            </View>
            <Text style={[bc.rowCount, item.mono ? bc.rowCountMono : bc.rowCountBlue]}>
              {Math.round(stats[item.key] / totalRecords * 100)}%
            </Text>
          </View>
        );
      })}
    </View>
  );
}
const bc = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
  },
  title: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { fontSize: 13, color: '#6C6C70', width: 30, textAlign: 'right' },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  bar: { height: 10, borderRadius: 5 },
  rowCount: { fontSize: 14, fontWeight: '700', width: 40, textAlign: 'right' },
  rowCountBlue: { color: '#007AFF' },
  rowCountMono: { color: '#8E8E93' },
  legendLabel: { fontSize: 12, color: '#6C6C70' },
  legendCount: { fontSize: 13, fontWeight: '700' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 4 },
  countBlock: { flex: 1, alignItems: 'center', gap: 6 },
  countNum: { fontSize: 28, fontWeight: '700' },
  countLbl: { fontSize: 13, color: '#8E8E93' },
  countDivider: { width: 0.5, height: 44, backgroundColor: '#E5E5EA' },
  separator: { height: 0.5, backgroundColor: '#E5E5EA', marginHorizontal: -16 },
});


export function ClassDetailScreen() {
  const route = useRoute<Route>();
  const { classId, className } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<GradeStackParamList>>();

  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const { records, loading: attLoading, upsertAttendance, deleteAttendance, stats: attStats } = useAttendance(classId);
  const { assignments, loading: asgLoading, addAssignment, toggleSubmitted, deleteAssignment, stats: asgStats } = useAssignments(classId);
  const { timetables } = useTimetables();

  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const [showAddAsg, setShowAddAsg] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDueEnabled, setNewDueEnabled] = useState(false);
  const [newDue, setNewDue] = useState(today);
  const [newMemo, setNewMemo] = useState('');
  const [newNotify, setNewNotify] = useState(false);
  const [showAsgCalendar, setShowAsgCalendar] = useState(false);

  const [showAddAtt, setShowAddAtt] = useState(false);
  const [attDate, setAttDate] = useState(today);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('present');
  const [attMemo, setAttMemo] = useState('');

  const kbOffset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, e => {
      Animated.timing(kbOffset, {
        toValue: e.endCoordinates.height,
        duration: e.duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, e => {
      Animated.timing(kbOffset, {
        toValue: 0,
        duration: e.duration ?? 250,
        useNativeDriver: false,
      }).start();
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [kbOffset]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);

  useEffect(() => {
    supabase.from('classes').select('*').eq('id', classId).single().then(({ data }) => {
      if (data) setClassInfo(data as Class);
    });
    supabase.from('notes').select('*').eq('class_id', classId).single().then(({ data }) => {
      if (data) setNote((data as Note).content ?? '');
    });
  }, [classId]);

  const handleSaveNote = async () => {
    setNoteSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('notes').upsert(
      { class_id: classId, user_id: user?.id ?? null, content: note, updated_at: new Date().toISOString() },
      { onConflict: 'class_id,user_id' }
    );
    setNoteSaving(false);
  };

  const handleAddAssignment = async () => {
    if (!newTitle.trim()) { Alert.alert('エラー', 'タイトルを入力してください'); return; }
    const { error, id } = await addAssignment({ title: newTitle.trim(), due_date: newDueEnabled ? newDue : undefined, memo: newMemo.trim() || undefined, class_id: classId });
    if (!error && id && newNotify && newDueEnabled) {
      await scheduleAssignmentNotification(id, newTitle.trim(), newDue);
    }
    setNewTitle(''); setNewDueEnabled(false); setNewDue(today); setNewMemo(''); setNewNotify(false); setShowAddAsg(false);
  };

  const openEditAttendance = (r: Attendance) => {
    setEditingRecord(r);
    setAttDate(r.date);
    setAttStatus(r.status);
    setAttMemo(r.memo ?? '');
    setShowCalendar(false);
    setShowAddAtt(true);
  };

  const handleAddAttendance = async () => {
    if (editingRecord && editingRecord.date !== attDate) {
      await deleteAttendance(editingRecord.id);
    }
    const error = await upsertAttendance(attDate, attStatus, attMemo);
    if (error) {
      Alert.alert('保存失敗', '出席記録の保存に失敗しました。');
      return;
    }
    setEditingRecord(null);
    setAttMemo('');
    setShowAddAtt(false);
  };



  if (attLoading || asgLoading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'attendance', label: '出席',  icon: 'person-outline' },
    { key: 'assignment', label: '課題',  icon: 'document-text-outline' },
    { key: 'note',       label: 'メモ',  icon: 'create-outline' },
  ];

  const timetable = classInfo
    ? (timetables.find(t => t.id === classInfo.timetable_id)
       ?? timetables.find(t => t.id === 'default')
       ?? (timetables.length === 1 ? timetables[0] : null))
    : null;
  const DAY_LABELS_SHORT = ['月', '火', '水', '木', '金', '土', '日'];

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* カスタムヘッダー */}
      <View style={s.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={s.backButton}>
          <Ionicons name="chevron-back" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{className}</Text>
        <View style={s.backButton} />
      </View>

      {/* サマリーカード */}
      <View style={s.summary}>
        {classInfo && (
          <View style={s.summaryMeta}>
            {timetable && (
              <View style={s.metaFlag}>
                <Text style={s.metaFlagText}>{timetable.academicYear}年度 {timetable.semester}</Text>
              </View>
            )}
            <View style={s.metaFlag}>
              <Text style={s.metaFlagText}>
                {DAY_LABELS_SHORT[classInfo.day_of_week]}曜{classInfo.period}限
              </Text>
            </View>
          </View>
        )}
        <Text style={s.summaryClassName} numberOfLines={2}>{className}</Text>
      </View>

      {/* 科目情報カード */}
      {classInfo && (
        <View style={s.infoCard}>
          {classInfo.credits != null && (
            <View style={s.infoItem}>
              <Ionicons name="school-outline" size={13} color="#8E8E93" />
              <Text style={s.infoText}>{classInfo.credits}単位</Text>
            </View>
          )}
          {classInfo.class_type && (
            <View style={s.infoItem}>
              <Ionicons name="bookmark-outline" size={13} color="#8E8E93" />
              <Text style={s.infoText}>{CLASS_TYPE_LABEL[classInfo.class_type]}</Text>
            </View>
          )}
          {classInfo.exam_date && (
            <View style={s.infoItem}>
              <Ionicons name="calendar-outline" size={13} color="#FF3B30" />
              <Text style={[s.infoText, { color: '#FF3B30' }]}>試験 {classInfo.exam_date}</Text>
            </View>
          )}
          {classInfo.exam_type && classInfo.exam_type !== 'none' && (
            <View style={s.infoItem}>
              <Ionicons name="document-outline" size={13} color="#8E8E93" />
              <Text style={s.infoText}>{EXAM_TYPE_LABEL[classInfo.exam_type]}</Text>
            </View>
          )}
          {classInfo.teacher && (
            <View style={s.infoItem}>
              <Ionicons name="person-outline" size={13} color="#8E8E93" />
              <Text style={s.infoText}>{classInfo.teacher}</Text>
            </View>
          )}
          {classInfo.room && (
            <View style={s.infoItem}>
              <Ionicons name="location-outline" size={13} color="#8E8E93" />
              <Text style={s.infoText}>{classInfo.room}</Text>
            </View>
          )}
        </View>
      )}

      {/* セグメントタブ */}
      <View style={s.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? '#007AFF' : '#8E8E93'}
            />
            <Text style={[s.tabLabel, activeTab === tab.key && s.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* タブコンテンツ */}
      {activeTab === 'attendance' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false} automaticallyAdjustContentInsets={false}>
          <View style={s.attInfoCard}>
            <AttendanceBarChart
              stats={attStats}
              totalRecords={records.length}
            />

            <View style={s.attInfoSeparator} />

            {/* 直近の記録 */}
            <View style={s.attInfoSection}>
              <Text style={s.attInfoSectionLabel}>直近の記録</Text>
              {records.length === 0 ? (
                <Text style={s.emptyText}>出席記録がありません</Text>
              ) : (() => {
                const r = records[0];
                const statusConf = {
                  present:   { label: '出席', filled: true  },
                  late:      { label: '遅刻', filled: false },
                  absent:    { label: '欠席', filled: false },
                  cancelled: { label: '休講', filled: false },
                }[r.status];
                return (
                  <TouchableOpacity
                    style={s.listRow}
                    onPress={() => openEditAttendance(r)}
                    activeOpacity={0.6}
                  >
                    <Text style={s.listSession}>第{records.length}回</Text>
                    <View style={s.listDateCol}>
                      <Text style={s.listDate}>{formatDate(r.date)}</Text>
                      {r.memo ? <Text style={s.listMemo} numberOfLines={1}>{r.memo}</Text> : null}
                    </View>
                    <View style={[
                      s.statusChip,
                      statusConf.filled
                        ? { backgroundColor: '#007AFF' }
                        : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#6C6C70' },
                    ]}>
                      <Text style={[s.statusChipText, { color: statusConf.filled ? '#FFFFFF' : '#6C6C70' }]}>
                        {statusConf.label}
                      </Text>
                      <Ionicons name="chevron-forward" size={13} color={statusConf.filled ? '#FFFFFF' : '#6C6C70'} />
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* 出席一覧ピルボタン */}
              {records.length > 0 && (
                <TouchableOpacity
                  style={s.listAllPill}
                  onPress={() => navigation.navigate('AttendanceList', { classId, className })}
                  activeOpacity={0.7}
                >
                  <Text style={s.listAllPillText}>一覧を見る（{records.length}件）</Text>
                  <Ionicons name="chevron-forward" size={12} color="#6C6C70" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => { setEditingRecord(null); setAttDate(today); setAttStatus('present'); setAttMemo(''); setShowCalendar(false); setShowAddAtt(true); }}
            style={s.registerBtn}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={s.registerBtnText}>出席を登録する</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'assignment' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false} automaticallyAdjustContentInsets={false}>
          {/* サマリーカード */}
          <View style={s.asgSummaryCard}>
            <View style={s.asgSummaryRow}>
              <View style={s.asgSummaryBlock}>
                <Text style={[s.asgSummaryNum, { color: '#007AFF' }]}>{asgStats.submitted}</Text>
                <Text style={s.asgSummaryLbl}>提出済み</Text>
              </View>
              <View style={s.asgSummaryDivider} />
              <View style={s.asgSummaryBlock}>
                <Text style={[s.asgSummaryNum, { color: '#1C1C1E' }]}>{asgStats.total - asgStats.submitted}</Text>
                <Text style={s.asgSummaryLbl}>未提出</Text>
              </View>
              <View style={s.asgSummaryDivider} />
              <View style={s.asgSummaryBlock}>
                <Text style={s.asgSummaryNum}>{asgStats.total}</Text>
                <Text style={s.asgSummaryLbl}>合計</Text>
              </View>
            </View>
            {asgStats.total > 0 && (
              <>
                <View style={s.asgSummarySep} />
                <View style={s.asgProgressRow}>
                  <View style={s.asgProgressTrack}>
                    <View style={[s.asgProgressFill, { width: `${asgStats.rate}%` as any, backgroundColor: '#007AFF' }]} />
                  </View>
                  <Text style={[s.asgProgressLabel, { color: '#007AFF' }]}>{asgStats.rate}%</Text>
                </View>
              </>
            )}
          </View>

          {/* 課題リスト（未提出のみ） */}
          <Text style={s.sectionLabel}>未提出の課題</Text>
          {(() => {
            const pending = assignments.filter(a => !a.is_submitted && (!a.due_date || a.due_date >= today));
            return (
              <View style={s.card}>
                {pending.length === 0 ? (
                  <View style={s.asgEmptyContainer}>
                    <Ionicons name="checkmark-circle-outline" size={36} color="#C7C7CC" />
                    <Text style={s.emptyText}>未提出の課題はありません</Text>
                  </View>
                ) : (
                  pending.map((item, idx) => {
                    const isOverdue = !!item.due_date && item.due_date < today;
                    const isToday = item.due_date === today;
                    const dueColor = isOverdue ? '#FF3B30' : isToday ? '#007AFF' : '#8E8E93';
                    return (
                      <View key={item.id} style={[s.listRow, idx < pending.length - 1 && s.listRowBorder]}>
                        <TouchableOpacity
                          style={s.checkbox}
                          onPress={() => toggleSubmitted(item.id, item.is_submitted)}
                        >
                        </TouchableOpacity>
                        <View style={s.asgInfo}>
                          <Text style={s.asgTitle} numberOfLines={2}>{item.title}</Text>
                          {item.due_date ? (
                            <View style={s.asgDueRow}>
                              <Ionicons name="time-outline" size={11} color={dueColor} />
                              <Text style={[s.asgDue, { color: dueColor }]}>
                                {isOverdue ? '期限切れ · ' : isToday ? '今日 · ' : ''}{item.due_date}
                              </Text>
                            </View>
                          ) : (
                            <Text style={s.asgNoDue}>締切なし</Text>
                          )}
                          {item.memo ? (
                            <Text style={s.asgMemo} numberOfLines={1}>{item.memo}</Text>
                          ) : null}
                        </View>
                        <TouchableOpacity
                          onPress={() => Alert.alert('削除', `「${item.title}」を削除しますか？`, [
                            { text: 'キャンセル', style: 'cancel' },
                            { text: '削除', style: 'destructive', onPress: () => deleteAssignment(item.id) },
                          ])}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color="#C7C7CC" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
                {assignments.length > 0 && (
                  <TouchableOpacity
                    style={s.listAllPill}
                    onPress={() => navigation.navigate('AssignmentList', { classId, className })}
                    activeOpacity={0.7}
                  >
                    <Text style={s.listAllPillText}>一覧を見る（{assignments.length}件）</Text>
                    <Ionicons name="chevron-forward" size={12} color="#6C6C70" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

          {/* 追加ボタン */}
          <TouchableOpacity
            onPress={() => setShowAddAsg(true)}
            style={s.registerBtn}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
            <Text style={s.registerBtnText}>課題を追加する</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'note' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false} automaticallyAdjustContentInsets={false}>
          <Text style={s.sectionLabel}>メモ</Text>
          <View style={s.card}>
            <TextInput
              style={s.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="評価基準・試験範囲・特記事項など自由に記録..."
              placeholderTextColor="#C7C7CC"
              multiline
              textAlignVertical="top"
              onBlur={handleSaveNote}
            />
          </View>
          <TouchableOpacity
            style={[s.saveNoteBtn, noteSaving && { opacity: 0.5 }]}
            onPress={handleSaveNote}
            disabled={noteSaving}
          >
            <Text style={s.saveNoteBtnText}>保存</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 課題追加モーダル */}
      <Modal visible={showAddAsg} transparent animationType="slide">
        <AnimatedPressable style={[s.overlay, { paddingBottom: kbOffset }]} onPress={() => { setShowAddAsg(false); setNewDueEnabled(false); setShowAsgCalendar(false); setNewMemo(''); }}>
          <Pressable style={s.attSheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.attSheetScroll}
            >
              <Text style={s.sheetTitle}>課題を追加</Text>
              <Text style={s.sheetLabel}>タイトル</Text>
              <TextInput
                style={s.sheetInput}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="例：レポート第3回"
                placeholderTextColor="#C7C7CC"
              />
              <Text style={s.sheetLabel}>締切日（任意）</Text>
              <TouchableOpacity
                style={s.datePicker}
                onPress={() => {
                  if (!newDueEnabled) {
                    setNewDueEnabled(true);
                    setShowAsgCalendar(true);
                  } else {
                    setShowAsgCalendar(v => !v);
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                <Text style={s.datePickerText}>
                  {newDueEnabled ? formatDate(newDue) : '設定しない'}
                </Text>
                {newDueEnabled ? (
                  <>
                    <Ionicons
                      name={showAsgCalendar ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#8E8E93"
                    />
                    <TouchableOpacity
                      onPress={() => { setNewDueEnabled(false); setShowAsgCalendar(false); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#C7C7CC" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <Ionicons name="chevron-down" size={14} color="#8E8E93" />
                )}
              </TouchableOpacity>
              {newDueEnabled && showAsgCalendar && (
                <Calendar
                  current={newDue}
                  onDayPress={(day: { dateString: string }) => {
                    setNewDue(day.dateString);
                    setShowAsgCalendar(false);
                  }}
                  markedDates={{
                    [newDue]: { selected: true, selectedColor: '#007AFF' },
                  }}
                  theme={{
                    todayTextColor: '#007AFF',
                    arrowColor: '#007AFF',
                    selectedDayBackgroundColor: '#007AFF',
                  }}
                  style={s.calendar}
                />
              )}
              <Text style={s.sheetLabel}>メモ（任意）</Text>
              <TextInput
                style={[s.sheetInput, s.attMemoInput]}
                value={newMemo}
                onChangeText={setNewMemo}
                placeholder="例：PDFで提出、10ページ以上..."
                placeholderTextColor="#C7C7CC"
                multiline
                textAlignVertical="top"
              />
              {newDueEnabled && (
                <TouchableOpacity
                  style={s.notifyRow}
                  onPress={() => setNewNotify(v => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={18} color={newNotify ? '#007AFF' : '#8E8E93'} />
                  <Text style={[s.notifyLabel, newNotify && s.notifyLabelActive]}>締切日に通知する</Text>
                  <View style={[s.toggle, newNotify && s.toggleActive]}>
                    <View style={[s.toggleThumb, newNotify && s.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.sheetConfirmBtn} onPress={handleAddAssignment}>
                <Text style={s.sheetConfirmText}>追加</Text>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </AnimatedPressable>
      </Modal>

      {/* 出席追加モーダル */}
      <Modal visible={showAddAtt} transparent animationType="slide">
          <AnimatedPressable style={[s.overlay, { paddingBottom: kbOffset }]} onPress={() => { setShowAddAtt(false); setEditingRecord(null); setAttMemo(''); }}>
            <Pressable style={s.attSheet} onPress={e => e.stopPropagation()}>
              <View style={s.sheetHandle} />
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.attSheetScroll}
              >
                <Text style={s.sheetTitle}>{editingRecord ? '出席を編集' : '出席を記録'}</Text>
                <Text style={s.sheetLabel}>日付</Text>
                <TouchableOpacity
                  style={s.datePicker}
                  onPress={() => setShowCalendar(v => !v)}
                >
                  <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                  <Text style={s.datePickerText}>{formatDate(attDate)}</Text>
                  <Ionicons
                    name={showCalendar ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#8E8E93"
                  />
                </TouchableOpacity>
                {showCalendar && (
                  <Calendar
                    current={attDate}
                    maxDate={today}
                    onDayPress={(day: { dateString: string }) => {
                      setAttDate(day.dateString);
                      setShowCalendar(false);
                    }}
                    markedDates={{
                      [attDate]: { selected: true, selectedColor: '#007AFF' },
                    }}
                    theme={{
                      todayTextColor: '#007AFF',
                      arrowColor: '#007AFF',
                      selectedDayBackgroundColor: '#007AFF',
                    }}
                    style={s.calendar}
                  />
                )}
                <Text style={s.sheetLabel}>状態</Text>
                <AttendanceButton selected={attStatus} onSelect={setAttStatus} />
                <Text style={s.sheetLabel}>メモ（任意）</Text>
                <TextInput
                  style={[s.sheetInput, s.attMemoInput]}
                  value={attMemo}
                  onChangeText={setAttMemo}
                  placeholder="例：資料配布あり、小テストあり..."
                  placeholderTextColor="#C7C7CC"
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity style={s.sheetConfirmBtn} onPress={handleAddAttendance}>
                  <Text style={s.sheetConfirmText}>{editingRecord ? '保存' : '記録'}</Text>
                </TouchableOpacity>
                {editingRecord && (
                  <TouchableOpacity
                    style={s.sheetDeleteBtn}
                    onPress={() => Alert.alert('削除', `${formatDate(editingRecord.date)} の出席記録を削除しますか？`, [
                      { text: 'キャンセル', style: 'cancel' },
                      { text: '削除', style: 'destructive', onPress: async () => {
                        await deleteAttendance(editingRecord.id);
                        setEditingRecord(null);
                        setShowAddAtt(false);
                      }},
                    ])}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                    <Text style={s.sheetDeleteText}>この記録を削除</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </Pressable>
          </AnimatedPressable>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  // カスタムヘッダー
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: { width: 36, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: '#1C1C1E' },

  // サマリー
  summary: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  summaryClassName: { fontSize: 22, fontWeight: '700', color: '#1C1C1E', letterSpacing: 0.2, textAlign: 'center' },
  summaryMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  metaFlag: {
    backgroundColor: '#3C3C43',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  metaFlagText: { fontSize: 11, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.3 },
  statBlock: { alignItems: 'center', gap: 2 },
  statNum: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  statLbl: { fontSize: 10, color: '#8E8E93' },
  statDivider: { width: 0.5, height: 28, backgroundColor: '#E5E5EA' },

  // タブバー
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: { borderBottomColor: '#007AFF' },
  tabLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  tabLabelActive: { color: '#007AFF', fontWeight: '600' },

  // コンテンツ
  tabContent: { padding: 16, gap: 14, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6C6C70',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 4,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E8F1FF',
    borderRadius: 10,
  },
  addBtnText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    overflow: 'hidden',
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  listRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#E5E5EA' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusChipText: { fontSize: 15, fontWeight: '600' },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
  },
  registerBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  yearDivider: {
    marginHorizontal: -14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  yearDividerText: { fontSize: 16, color: '#3C3C43', fontWeight: '700', letterSpacing: 0.5 },
  listSession: { fontSize: 13, color: '#8E8E93', fontWeight: '500', width: 44 },
  listDateCol: { flex: 1, gap: 3 },
  listDate: { fontSize: 16, color: '#1C1C1E' },
  listMemo: { fontSize: 13, color: '#8E8E93' },
  listStatus: { fontSize: 14, fontWeight: '600' },

  emptyText: { textAlign: 'center', color: '#C7C7CC', fontSize: 14, paddingVertical: 20 },

  // 出席タブ
  attTabContainer: { flex: 1 },
  attInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  attInfoSeparator: { height: 0.5, backgroundColor: '#E5E5EA', marginHorizontal: 16 },
  attInfoSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  attInfoSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 0,
  },
  listAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listAllBtnText: { flex: 1, fontSize: 15, color: '#3C3C43', fontWeight: '500' },
  listAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 3,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  listAllPillText: { fontSize: 12, color: '#6C6C70', fontWeight: '500' },
  registerBtnFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 0,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },

  // 課題サマリーカード
  asgSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 14,
  },
  asgSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  asgSummaryBlock: { flex: 1, alignItems: 'center', gap: 4 },
  asgSummaryNum: { fontSize: 28, fontWeight: '700', color: '#1C1C1E' },
  asgSummaryLbl: { fontSize: 12, color: '#8E8E93' },
  asgSummaryDivider: { width: 0.5, height: 44, backgroundColor: '#E5E5EA' },
  asgSummarySep: { height: 0.5, backgroundColor: '#E5E5EA', marginHorizontal: -16 },
  asgProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  asgProgressTrack: {
    flex: 1, height: 6, borderRadius: 3,
    backgroundColor: '#E5E5EA', overflow: 'hidden',
  },
  asgProgressFill: { height: 6, borderRadius: 3 },
  asgProgressLabel: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
  asgEmptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  asgDueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  asgNoDue: { fontSize: 12, color: '#C7C7CC', marginTop: 3 },
  asgMemo: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  // 課題
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  asgInfo: { flex: 1 },
  asgTitle: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  strikethrough: { textDecorationLine: 'line-through', color: '#C7C7CC' },
  asgDue: { fontSize: 12, fontWeight: '500' },

  // メモ
  noteInput: {
    fontSize: 15,
    color: '#1C1C1E',
    minHeight: 180,
    paddingVertical: 14,
    lineHeight: 22,
  },
  saveNoteBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveNoteBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // モーダルシート
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
  },
  datePickerText: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  attSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center', marginBottom: 4,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  sheetLabel: { fontSize: 13, color: '#6C6C70', fontWeight: '500', marginTop: 4 },
  sheetInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1C1C1E',
  },
  sheetConfirmBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  sheetConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sheetDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  sheetDeleteText: { color: '#FF3B30', fontSize: 15, fontWeight: '500' },
  attMemoInput: { minHeight: 72, paddingTop: 12 },
  attSheetScroll: { gap: 10, paddingBottom: 16 },


  // 通知トグル
  notifyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
  },
  notifyLabel: { flex: 1, fontSize: 15, color: '#8E8E93' },
  notifyLabelActive: { color: '#007AFF' },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: '#007AFF' },
  toggleThumb: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  toggleThumbActive: { alignSelf: 'flex-end' },

  // 科目情報カード
  infoCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  infoText: { fontSize: 12, color: '#3C3C43', fontWeight: '500' },
});
