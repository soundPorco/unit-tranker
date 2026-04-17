import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Pressable,
  Animated, Keyboard, Platform, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAssignments } from '../hooks/useAssignments';
import { scheduleAssignmentNotification, cancelAssignmentNotification, hasAssignmentNotification } from '../lib/notifications';
import { GradeStackParamList, Assignment } from '../types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Route = RouteProp<GradeStackParamList, 'AssignmentList'>;

const today = new Date().toISOString().slice(0, 10);

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAY_LABELS[d.getDay()]})`;
}

type Section = {
  title: string;
  color: string;
  dotColor: string;
  items: Assignment[];
};

function buildSections(assignments: Assignment[]): Section[] {
  const overdue:   Assignment[] = [];
  const pending:   Assignment[] = [];
  const submitted: Assignment[] = [];

  for (const a of assignments) {
    if (a.is_submitted) {
      submitted.push(a);
    } else if (a.due_date && a.due_date < today) {
      overdue.push(a);
    } else {
      pending.push(a);
    }
  }

  return ([
    { title: '未提出',   color: '#3eb370', dotColor: '#3eb370', items: pending   },
    { title: '期限切れ', color: '#FF3B30', dotColor: '#FF3B30', items: overdue   },
    { title: '提出済み', color: '#8E8E93', dotColor: '#8E8E93', items: submitted },
  ]).filter(s => s.items.length > 0);
}

export function ClassAssignmentListScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { classId } = route.params;

  const { assignments, loading, updateAssignment, deleteAssignment } = useAssignments(classId);

  const [editing, setEditing] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDueEnabled, setEditDueEnabled] = useState(false);
  const [editDue, setEditDue] = useState(today);
  const [editMemo, setEditMemo] = useState('');
  const [editSubmitted, setEditSubmitted] = useState(false);
  const [editNotify, setEditNotify] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

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

  const openEdit = async (item: Assignment) => {
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

  const handleDelete = (item: Assignment) => {
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
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={s.backButton}>
            <Ionicons name="chevron-back" size={26} color="#3eb370" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>課題一覧</Text>
          <View style={s.backButton} />
        </View>
        <View style={s.headerDivider} />
        <ActivityIndicator color="#3eb370" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const sections = buildSections(assignments);

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={s.backButton}>
          <Ionicons name="chevron-back" size={26} color="#3eb370" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>課題一覧</Text>
        <View style={s.backButton} />
      </View>
      <View style={s.headerDivider} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {assignments.length === 0 ? (
          <View style={s.emptyContainer}>
            <Ionicons name="document-text-outline" size={36} color="#C7C7CC" />
            <Text style={s.emptyText}>課題がありません</Text>
          </View>
        ) : (
          sections.map(section => (
            <View key={section.title}>
              <View style={s.sectionHeader}>
                <View style={[s.sectionDot, { backgroundColor: section.dotColor }]} />
                <Text style={[s.sectionTitle, { color: section.color }]}>{section.title}</Text>
                <Text style={s.sectionCount}>{section.items.length}件</Text>
              </View>

              <View style={s.card}>
                {section.items.map((item, idx) => {
                  const isOverdue = !item.is_submitted && !!item.due_date && item.due_date < today;
                  const isToday   = !item.is_submitted && item.due_date === today;
                  const dueColor  = item.is_submitted ? '#8E8E93' : isOverdue ? '#FF3B30' : isToday ? '#3eb370' : '#8E8E93';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[s.listRow, idx < section.items.length - 1 && s.listRowBorder]}
                      onPress={() => openEdit(item)}
                      activeOpacity={0.6}
                    >
                      <View style={s.itemBody}>
                        <Text style={[s.itemTitle, item.is_submitted && s.itemTitleDone]} numberOfLines={2}>
                          {item.title}
                        </Text>
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
                <Ionicons name="calendar-outline" size={16} color="#3eb370" />
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
                  markedDates={{ [editDue]: { selected: true, selectedColor: '#3eb370' } }}
                  theme={{ todayTextColor: '#3eb370', arrowColor: '#3eb370', selectedDayBackgroundColor: '#3eb370' }}
                  style={s.calendar}
                />
              )}

              <Text style={s.sheetLabel}>ステータス</Text>
              {(() => {
                const isOverdue = !editSubmitted && editDueEnabled && editDue < today;
                const currentStatus = editSubmitted ? 'submitted' : isOverdue ? 'overdue' : 'pending';
                const statusOptions: { key: 'pending' | 'overdue' | 'submitted'; label: string; icon: string; color: string }[] = [
                  { key: 'pending',   label: '未提出',   icon: 'ellipse-outline',  color: '#3eb370' },
                  { key: 'overdue',   label: '期限切れ', icon: 'alert-circle',     color: '#FF3B30' },
                  { key: 'submitted', label: '提出済み', icon: 'checkmark-circle', color: '#34C759' },
                ];
                return (
                  <View style={s.statusRow}>
                    {statusOptions.map(opt => {
                      const active = currentStatus === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[s.statusBtn, active && { backgroundColor: opt.color }]}
                          onPress={() => {
                            if (opt.key === 'submitted') setEditSubmitted(true);
                            else setEditSubmitted(false);
                          }}
                        >
                          <Ionicons
                            name={opt.icon as any}
                            size={16}
                            color={active ? '#FFFFFF' : '#8E8E93'}
                          />
                          <Text style={[s.statusBtnText, active && s.statusBtnTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}

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
                  <Ionicons name="notifications-outline" size={18} color={editNotify ? '#3eb370' : '#8E8E93'} />
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: { width: 36, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  headerDivider: { height: 0.5, backgroundColor: '#E5E5EA' },
  content: { padding: 16, paddingBottom: 40, gap: 6 },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyText: { fontSize: 14, color: '#C7C7CC' },

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

  itemBody: { flex: 1, gap: 4 },
  itemTitle: { fontSize: 15, fontWeight: '500', color: '#1C1C1E', lineHeight: 20 },
  itemTitleDone: { color: '#8E8E93' },
  strikethrough: { textDecorationLine: 'line-through', color: '#C7C7CC' },

  dueDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
    backgroundColor: '#3eb370',
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
  statusBtnActive: { backgroundColor: '#3eb370' },
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
  notifyLabelActive: { color: '#3eb370' },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: '#E5E5EA',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: '#3eb370' },
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
