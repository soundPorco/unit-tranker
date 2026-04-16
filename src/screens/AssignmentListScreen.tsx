import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Pressable,
  Animated, Keyboard, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAllAssignments, AssignmentWithClass } from '../hooks/useAllAssignments';
import { scheduleAssignmentNotification, cancelAssignmentNotification, hasAssignmentNotification } from '../lib/notifications';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Filter = 'all' | 'pending' | 'submitted';

const today = new Date().toISOString().slice(0, 10);

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const CLASS_DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日']; // DayOfWeek: 0=月〜6=日
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAY_LABELS[d.getDay()]})`;
}


type Section = {
  title: string;
  urgency: 'overdue' | 'pending' | 'done';
  data: AssignmentWithClass[];
};

function groupAssignments(list: AssignmentWithClass[]): Section[] {
  const pendingList: AssignmentWithClass[] = [];
  const overdue:     AssignmentWithClass[] = [];
  const doneList:    AssignmentWithClass[] = [];

  for (const a of list) {
    if (a.is_submitted) {
      doneList.push(a);
    } else if (!!a.due_date && a.due_date < today) {
      overdue.push(a);
    } else {
      pendingList.push(a);
    }
  }

  return ([
    { title: '未提出',   urgency: 'pending' as const, data: pendingList },
    { title: '期限切れ', urgency: 'overdue' as const, data: overdue     },
    { title: '提出済み', urgency: 'done'    as const, data: doneList    },
  ]).filter(sec => sec.data.length > 0);
}

const URGENCY_COLOR: Record<string, string> = {
  pending: '#007AFF',
  overdue: '#FF3B30',
  done:    '#8E8E93',
};

const DAY_COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5AC8FA', '#FF6B6B'];

export function AssignmentListScreen() {
  const { assignments, loading, refetch, updateAssignment, deleteAssignment } = useAllAssignments();
  const [filter, setFilter] = useState<Filter>('all');

  const [editing, setEditing] = useState<AssignmentWithClass | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueEnabled, setEditDueEnabled] = useState(false);
  const [editDue, setEditDue] = useState(today);
  const [editMemo, setEditMemo] = useState('');
  const [editSubmitted, setEditSubmitted] = useState(false);
  const [editNotify, setEditNotify] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));

  const kbOffset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, e => {
      Animated.timing(kbOffset, { toValue: e.endCoordinates.height, duration: e.duration ?? 250, useNativeDriver: false }).start();
    });
    const onHide = Keyboard.addListener(hideEvent, e => {
      Animated.timing(kbOffset, { toValue: 0, duration: e.duration ?? 250, useNativeDriver: false }).start();
    });
    return () => { onShow.remove(); onHide.remove(); };
  }, [kbOffset]);

  const filtered = useMemo(() => {
    if (filter === 'pending')   return assignments.filter(a => !a.is_submitted);
    if (filter === 'submitted') return assignments.filter(a => a.is_submitted);
    return assignments;
  }, [assignments, filter]);

  const sections = useMemo(() => groupAssignments(filtered), [filtered]);


  const openEdit = async (item: AssignmentWithClass) => {
    setEditing(item);
    setEditTitle(item.title);
    setEditDueEnabled(!!item.due_date);
    setEditDue(item.due_date ?? today);
    setEditMemo(item.memo ?? '');
    setEditSubmitted(item.is_submitted);
    setShowCalendar(false);
    const hasNotif = await hasAssignmentNotification(item.id);
    setEditNotify(hasNotif);
  };

  const closeEdit = () => {
    setEditing(null);
    setShowCalendar(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editTitle.trim()) { Alert.alert('エラー', 'タイトルを入力してください'); return; }
    await updateAssignment(editing.id, {
      title: editTitle.trim(),
      due_date: editDueEnabled ? editDue : null,
      memo: editMemo.trim() || null,
      is_submitted: editSubmitted,
    });
    if (editNotify && editDueEnabled) {
      await scheduleAssignmentNotification(editing.id, editTitle.trim(), editDue);
    } else {
      await cancelAssignmentNotification(editing.id);
    }
    closeEdit();
  };

  const handleDelete = (item: AssignmentWithClass) => {
    Alert.alert('削除', `「${item.title}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        await deleteAssignment(item.id);
        closeEdit();
      }},
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top']}>
        <View style={s.container}>
          <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      <View style={s.container}>
      {/* ヘッダー */}
      <View style={s.header}>
        <View style={s.headerSide} />
        <View style={s.headerCenter}>
          <Text style={s.title}>課題</Text>
        </View>
        <View style={s.headerSide} />
      </View>

      {/* フィルタータブ */}
      <View style={s.filterBar}>
        {([['all', '全て'], ['pending', '未提出'], ['submitted', '提出済み']] as [Filter, string][]).map(
          ([key, label]) => {
            const active = filter === key;
            return (
              <TouchableOpacity
                key={key}
                style={s.filterTab}
                onPress={() => setFilter(key)}
                activeOpacity={0.7}
              >
                <Text style={[s.filterTabText, active && s.filterTabTextActive]}>{label}</Text>
                {active && <View style={s.filterTabIndicator} />}
              </TouchableOpacity>
            );
          }
        )}
      </View>

      {/* 課題リスト */}
      <ScrollView
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={52} color="#C7C7CC" />
            <Text style={s.emptyTitle}>
              {filter === 'pending' ? 'すべて提出済みです' : '課題がありません'}
            </Text>
            <Text style={s.emptyDesc}>科目詳細から課題を追加できます</Text>
          </View>
        ) : (
          sections.map(section => (
            <View key={section.title}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionDot, { backgroundColor: URGENCY_COLOR[section.urgency] }]} />
                <Text style={[s.sectionTitle, { color: URGENCY_COLOR[section.urgency] }]}>
                  {section.title}
                </Text>
                <Text style={s.sectionCount}>{section.data.length}件</Text>
              </View>

              <View style={s.card}>
                {section.data.map((item, idx) => {
                  const isOverdue = !item.is_submitted && !!item.due_date && item.due_date < today;
                  const isToday   = !item.is_submitted && item.due_date === today;
                  const dueColor  = item.is_submitted ? '#8E8E93' : isOverdue ? '#FF3B30' : isToday ? '#FF9500' : '#8E8E93';
                  const dayColor  = item.classes?.day_of_week != null
                    ? DAY_COLORS[item.classes.day_of_week]
                    : '#8E8E93';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[s.listRow, idx < section.data.length - 1 && s.listRowBorder]}
                      onPress={() => openEdit(item)}
                      activeOpacity={0.6}
                    >
                      <View style={s.itemBody}>
                        <Text
                          style={[s.itemTitle, item.is_submitted && s.itemTitleDone]}
                          numberOfLines={2}
                        >
                          {item.title}
                        </Text>
                        <View style={s.itemMeta}>
                          {item.classes && (
                            <>
                              <View style={[s.classPill, { backgroundColor: dayColor + '18' }]}>
                                <Text style={[s.classPillText, { color: dayColor }]}>
                                  {CLASS_DAY_LABELS[item.classes.day_of_week]}{item.classes.period}限
                                </Text>
                              </View>
                              <View style={[s.classPill, { backgroundColor: dayColor + '18' }]}>
                                <Text style={[s.classPillText, { color: dayColor }]}>
                                  {item.classes.name}
                                </Text>
                              </View>
                            </>
                          )}
                          {item.due_date ? (
                            <View style={s.dueDateRow}>
                              <Ionicons name="time-outline" size={11} color={dueColor} />
                              <Text style={[s.dueDate, { color: dueColor }]}>
                                {isToday ? '今日 · ' : ''}{formatDate(item.due_date)}
                              </Text>
                            </View>
                          ) : (
                            <Text style={s.noDue}>締切なし</Text>
                          )}
                        </View>
                        {item.memo ? (
                          <Text style={s.memo} numberOfLines={1}>{item.memo}</Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 編集シート */}
      <Modal visible={!!editing} transparent animationType="slide">
        <AnimatedPressable style={[s.overlay, { paddingBottom: kbOffset }]} onPress={closeEdit}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.sheetHandle} />
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.sheetScroll}
            >
              <Text style={s.sheetTitle}>課題を編集</Text>

              <Text style={s.sheetLabel}>タイトル</Text>
              <TextInput
                style={s.sheetInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="例：レポート第3回"
                placeholderTextColor="#C7C7CC"
              />

              <Text style={s.sheetLabel}>締切日（任意）</Text>
              <TouchableOpacity
                style={s.datePicker}
                onPress={() => {
                  if (!editDueEnabled) {
                    setEditDueEnabled(true);
                    setShowCalendar(true);
                  } else {
                    setShowCalendar(v => !v);
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                <Text style={s.datePickerText}>
                  {editDueEnabled ? formatDate(editDue) : '設定しない'}
                </Text>
                {editDueEnabled ? (
                  <>
                    <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={14} color="#8E8E93" />
                    <TouchableOpacity
                      onPress={() => { setEditDueEnabled(false); setShowCalendar(false); }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={16} color="#C7C7CC" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <Ionicons name="chevron-down" size={14} color="#8E8E93" />
                )}
              </TouchableOpacity>
              {editDueEnabled && showCalendar && (
                <Calendar
                  current={editDue}
                  onDayPress={(day: { dateString: string }) => {
                    setEditDue(day.dateString);
                    setShowCalendar(false);
                  }}
                  markedDates={{ [editDue]: { selected: true, selectedColor: '#007AFF' } }}
                  theme={{ todayTextColor: '#007AFF', arrowColor: '#007AFF', selectedDayBackgroundColor: '#007AFF' }}
                  style={s.calendar}
                />
              )}

              <Text style={s.sheetLabel}>ステータス</Text>
              <View style={s.statusRow}>
                {([false, true] as const).map(val => (
                  <TouchableOpacity
                    key={String(val)}
                    style={[s.statusBtn, editSubmitted === val && s.statusBtnActive]}
                    onPress={() => setEditSubmitted(val)}
                  >
                    <Ionicons
                      name={val ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={editSubmitted === val ? '#FFFFFF' : '#8E8E93'}
                    />
                    <Text style={[s.statusBtnText, editSubmitted === val && s.statusBtnTextActive]}>
                      {val ? '提出済み' : '未提出'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.sheetLabel}>メモ（任意）</Text>
              <TextInput
                style={[s.sheetInput, s.memoInput]}
                value={editMemo}
                onChangeText={setEditMemo}
                placeholder="例：PDFで提出、10ページ以上..."
                placeholderTextColor="#C7C7CC"
                multiline
                textAlignVertical="top"
              />

              {editDueEnabled && (
                <TouchableOpacity
                  style={s.notifyRow}
                  onPress={() => setEditNotify(v => !v)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="notifications-outline" size={18} color={editNotify ? '#007AFF' : '#8E8E93'} />
                  <Text style={[s.notifyLabel, editNotify && s.notifyLabelActive]}>締切日に通知する</Text>
                  <View style={[s.toggle, editNotify && s.toggleActive]}>
                    <View style={[s.toggleThumb, editNotify && s.toggleThumbActive]} />
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <Text style={s.saveBtnText}>保存</Text>
              </TouchableOpacity>

              {editing && (
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(editing)}>
                  <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                  <Text style={s.deleteBtnText}>この課題を削除</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </Pressable>
        </AnimatedPressable>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', letterSpacing: 0.2 },

  filterBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E0E0E0',
  },
  filterTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  filterTabText: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  filterTabTextActive: { color: '#007AFF', fontWeight: '600' },
  filterTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#007AFF',
    borderRadius: 1,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 40, gap: 6 },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: '#3C3C43', marginTop: 8 },
  emptyDesc:  { fontSize: 14, color: '#8E8E93' },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    marginLeft: 2,
  },
  sectionDot: { width: 7, height: 7, borderRadius: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  sectionCount: { fontSize: 12, color: '#8E8E93', marginLeft: 2 },

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

  itemBody: { flex: 1, gap: 5 },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#1C1C1E', lineHeight: 20 },
  itemTitleDone: { color: '#8E8E93' },

  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  classPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },

  classPillText: { fontSize: 11, fontWeight: '600' },
  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dueDate: { fontSize: 12, fontWeight: '500' },
  noDue: { fontSize: 12, color: '#C7C7CC' },
  memo: { fontSize: 12, color: '#8E8E93' },

  // 編集シート
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
  },
  sheetScroll: { gap: 10, paddingBottom: 16 },
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
  memoInput: { minHeight: 72, paddingTop: 12 },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
  },
  datePickerText: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  calendar: { borderRadius: 12, overflow: 'hidden' },
  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
  },
  statusBtnActive: { backgroundColor: '#007AFF' },
  statusBtnText: { fontSize: 14, color: '#8E8E93', fontWeight: '500' },
  statusBtnTextActive: { color: '#FFFFFF', fontWeight: '600' },

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

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteBtnText: { color: '#FF3B30', fontSize: 15, fontWeight: '500' },
});
