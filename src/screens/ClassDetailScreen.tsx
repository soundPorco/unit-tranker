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
import { supabase } from '../lib/supabase';
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
      <Text style={bc.title}>出席内訳</Text>
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  title: { fontSize: 12, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 12, color: '#6C6C70', width: 28, textAlign: 'right' },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F2F2F7',
    overflow: 'hidden',
  },
  bar: { height: 8, borderRadius: 4 },
  rowCount: { fontSize: 13, fontWeight: '700', width: 38, textAlign: 'right' },
  rowCountBlue: { color: '#007AFF' },
  rowCountMono: { color: '#8E8E93' },
  legendLabel: { fontSize: 12, color: '#6C6C70' },
  legendCount: { fontSize: 13, fontWeight: '700' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  countBlock: { flex: 1, alignItems: 'center', gap: 2 },
  countNum: { fontSize: 26, fontWeight: '700' },
  countLbl: { fontSize: 13, color: '#8E8E93' },
  countDivider: { width: 0.5, height: 36, backgroundColor: '#E5E5EA' },
  separator: { height: 0.5, backgroundColor: '#E5E5EA', marginHorizontal: -14 },
});

// 出席率のリング
function RingGauge({ rate, color }: { rate: number; color: string }) {
  const label = rate === 0 ? '—' : `${rate}%`;
  return (
    <View style={ring.container}>
      <View style={[ring.track, { borderColor: '#E5E5EA' }]}>
        <View style={[ring.fill, {
          borderColor: color,
          // 簡易的に回転でリング風を表現（右半分）
          transform: [{ rotate: `${Math.min(rate / 100 * 360, 180)}deg` }],
        }]} />
      </View>
      <View style={ring.center}>
        <Text style={[ring.value, { color }]}>{label}</Text>
        <Text style={ring.subLabel}>出席率</Text>
      </View>
    </View>
  );
}
const ring = StyleSheet.create({
  container: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 6, borderColor: '#E5E5EA',
  },
  fill: {
    position: 'absolute', width: 80, height: 80, borderRadius: 40,
    borderWidth: 6, borderColor: '#007AFF',
    borderLeftColor: 'transparent', borderBottomColor: 'transparent',
  },
  center: { alignItems: 'center' },
  value: { fontSize: 16, fontWeight: '700' },
  subLabel: { fontSize: 9, color: '#8E8E93', marginTop: 1 },
});

export function ClassDetailScreen() {
  const route = useRoute<Route>();
  const { classId, className } = route.params;
  const navigation = useNavigation<NativeStackNavigationProp<GradeStackParamList>>();

  const [activeTab, setActiveTab] = useState<Tab>('attendance');
  const { records, loading: attLoading, upsertAttendance, deleteAttendance, stats: attStats } = useAttendance(classId);
  const { assignments, loading: asgLoading, addAssignment, toggleSubmitted, deleteAssignment, stats: asgStats } = useAssignments(classId);

  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [note, setNote] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  const [showAddAsg, setShowAddAsg] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState(today);

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
    await addAssignment({ title: newTitle.trim(), due_date: newDue, class_id: classId });
    setNewTitle(''); setNewDue(today); setShowAddAsg(false);
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


  // ステータスカラー
  const attColor = attStats.rate >= 80 ? '#34C759' : attStats.rate >= 60 ? '#FF9500' : '#FF3B30';
  const asgColor = asgStats.rate >= 80 ? '#34C759' : asgStats.rate >= 60 ? '#FF9500' : '#FF3B30';

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

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      {/* サマリーカード */}
      <View style={s.summary}>
        <View style={s.summaryLeft}>
          <Text style={s.summaryClassName} numberOfLines={2}>{className}</Text>
          <RingGauge rate={attStats.rate} color={attColor} />
        </View>
        <View style={s.summaryStats}>
          <View style={s.statBlock}>
            <Text style={[s.statNum, { color: asgColor }]}>{asgStats.rate}%</Text>
            <Text style={s.statLbl}>課題提出率</Text>
          </View>
        </View>
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
        <View style={s.attTabContainer}>
          <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
            {/* 出席情報 */}
            <View style={s.listHeader}>
              <Text style={s.sectionLabel}>出席情報</Text>
            </View>

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
              </View>

              {/* 出席一覧ボタン */}
              {records.length > 0 && (
                <>
                  <View style={s.attInfoSeparator} />
                  <TouchableOpacity
                    style={s.listAllRow}
                    onPress={() => navigation.navigate('AttendanceList', { classId, className })}
                  >
                    <Ionicons name="list-outline" size={16} color="#007AFF" />
                    <Text style={s.listAllBtnText}>出席一覧を見る（{records.length}件）</Text>
                    <Ionicons name="chevron-forward" size={14} color="#007AFF" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </ScrollView>

          {/* 固定フッター：出席登録ボタン */}
          <View style={s.registerBtnFooter}>
            <TouchableOpacity
              onPress={() => { setEditingRecord(null); setAttDate(today); setAttStatus('present'); setAttMemo(''); setShowCalendar(false); setShowAddAtt(true); }}
              style={s.registerBtn}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={s.registerBtnText}>出席を登録する</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {activeTab === 'assignment' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
          <View style={s.listHeader}>
            <Text style={s.sectionLabel}>課題一覧 ({asgStats.submitted}/{asgStats.total})</Text>
            <TouchableOpacity onPress={() => setShowAddAsg(true)} style={s.addBtn}>
              <Ionicons name="add" size={16} color="#007AFF" />
              <Text style={s.addBtnText}>追加</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            {assignments.length === 0 ? (
              <Text style={s.emptyText}>課題が登録されていません</Text>
            ) : (
              assignments.map((item, idx) => {
                const isOverdue = !item.is_submitted && item.due_date < today;
                return (
                  <View key={item.id} style={[s.listRow, idx < assignments.length - 1 && s.listRowBorder]}>
                    <TouchableOpacity
                      style={[s.checkbox, item.is_submitted && s.checkboxDone]}
                      onPress={() => toggleSubmitted(item.id, item.is_submitted)}
                    >
                      {item.is_submitted && (
                        <Ionicons name="checkmark" size={13} color="#fff" />
                      )}
                    </TouchableOpacity>
                    <View style={s.asgInfo}>
                      <Text style={[s.asgTitle, item.is_submitted && s.strikethrough]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={[s.asgDue, isOverdue && { color: '#FF3B30' }]}>
                        {isOverdue ? '期限切れ · ' : ''}{item.due_date}
                      </Text>
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
          </View>
        </ScrollView>
      )}

      {activeTab === 'note' && (
        <ScrollView contentContainerStyle={s.tabContent} showsVerticalScrollIndicator={false}>
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
        <Pressable style={s.overlay} onPress={() => setShowAddAsg(false)}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>課題を追加</Text>
            <Text style={s.sheetLabel}>タイトル</Text>
            <TextInput
              style={s.sheetInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="例：レポート第3回"
              placeholderTextColor="#C7C7CC"
              autoFocus
            />
            <Text style={s.sheetLabel}>締切日（YYYY-MM-DD）</Text>
            <TextInput
              style={s.sheetInput}
              value={newDue}
              onChangeText={setNewDue}
              placeholder={today}
              placeholderTextColor="#C7C7CC"
              keyboardType="numbers-and-punctuation"
            />
            <TouchableOpacity style={s.sheetConfirmBtn} onPress={handleAddAssignment}>
              <Text style={s.sheetConfirmText}>追加</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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

  // サマリー
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  summaryLeft: { alignItems: 'center', gap: 6 },
  summaryClassName: { fontSize: 11, fontWeight: '600', color: '#8E8E93', textAlign: 'center', maxWidth: 80 },
  summaryStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
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
  tabContent: { padding: 16, gap: 8, paddingBottom: 40 },

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
    paddingVertical: 12,
    gap: 10,
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
  listSession: { fontSize: 12, color: '#8E8E93', fontWeight: '500', width: 40 },
  listDateCol: { flex: 1, gap: 2 },
  listDate: { fontSize: 15, color: '#1C1C1E' },
  listMemo: { fontSize: 12, color: '#8E8E93' },
  listStatus: { fontSize: 14, fontWeight: '600' },

  emptyText: { textAlign: 'center', color: '#C7C7CC', fontSize: 14, paddingVertical: 20 },

  // 出席タブ
  attTabContainer: { flex: 1 },
  attInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  attInfoSeparator: { height: 0.5, backgroundColor: '#E5E5EA', marginHorizontal: 14 },
  attInfoSection: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  attInfoSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  listAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  listAllBtnText: { flex: 1, fontSize: 15, color: '#007AFF', fontWeight: '500' },
  registerBtnFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#F2F2F7',
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },

  // 課題
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#C7C7CC',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: '#34C759', borderColor: '#34C759' },
  asgInfo: { flex: 1 },
  asgTitle: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
  strikethrough: { textDecorationLine: 'line-through', color: '#C7C7CC' },
  asgDue: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

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
