import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Modal, Pressable,
  Animated, Keyboard, Platform,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
import { Calendar } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAttendance } from '../hooks/useAttendance';
import { AttendanceButton } from '../components/AttendanceButton';
import { GradeStackParamList, Attendance, AttendanceStatus } from '../types';

type Route = RouteProp<GradeStackParamList, 'AttendanceList'>;

const today = new Date().toISOString().slice(0, 10);

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAY_LABELS[d.getDay()]})`;
}

export function AttendanceListScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const { classId } = route.params;

  const { records, loading, upsertAttendance, deleteAttendance } = useAttendance(classId);

  const [showAddAtt, setShowAddAtt] = useState(false);
  const [attDate, setAttDate] = useState(today);
  const [attStatus, setAttStatus] = useState<AttendanceStatus>('present');
  const [attMemo, setAttMemo] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);

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

  const openEdit = (r: Attendance) => {
    setEditingRecord(r);
    setAttDate(r.date);
    setAttStatus(r.status);
    setAttMemo(r.memo ?? '');
    setShowCalendar(false);
    setShowAddAtt(true);
  };

  const handleSave = async () => {
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

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top', 'bottom']}>
        <View style={s.customHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={s.backButton}>
            <Ionicons name="chevron-back" size={26} color="#007AFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>出席一覧</Text>
          <View style={s.backButton} />
        </View>
        <View style={s.headerDivider} />
        <ActivityIndicator color="#007AFF" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8} style={s.backButton}>
          <Ionicons name="chevron-back" size={26} color="#007AFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>出席一覧</Text>
        <View style={s.backButton} />
      </View>
      <View style={s.headerDivider} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          {records.length === 0 ? (
            <Text style={s.emptyText}>出席記録がありません</Text>
          ) : (
            (() => {
              let lastYear: number | null = null;
              return records.map((r, idx) => {
                const statusConf = {
                  present:   { label: '出席', filled: true  },
                  late:      { label: '遅刻', filled: false },
                  absent:    { label: '欠席', filled: false },
                  cancelled: { label: '休講', filled: false },
                }[r.status];
                const sessionNum = records.length - idx;
                const year = new Date(r.date).getFullYear();
                const showYearDivider = year !== lastYear;
                lastYear = year;
                return (
                  <React.Fragment key={r.id}>
                    {showYearDivider && (
                      <View style={s.yearDivider}>
                        <Text style={s.yearDividerText}>{year}年</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[s.listRow, idx < records.length - 1 && s.listRowBorder]}
                      onPress={() => openEdit(r)}
                      activeOpacity={0.6}
                    >
                      <Text style={s.listSession}>第{sessionNum}回</Text>
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
                  </React.Fragment>
                );
              });
            })()
          )}
        </View>
      </ScrollView>

      {/* 編集モーダル */}
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
              <Text style={s.sheetTitle}>出席を編集</Text>
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
              <TouchableOpacity style={s.sheetConfirmBtn} onPress={handleSave}>
                <Text style={s.sheetConfirmText}>保存</Text>
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: { width: 36, alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  headerDivider: { height: 0.5, backgroundColor: '#E5E5EA' },
  content: { padding: 16, paddingBottom: 40 },

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
  listSession: { fontSize: 12, color: '#8E8E93', fontWeight: '500', width: 40 },
  listDateCol: { flex: 1, gap: 2 },
  listDate: { fontSize: 15, color: '#1C1C1E' },
  listMemo: { fontSize: 12, color: '#8E8E93' },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statusChipText: { fontSize: 15, fontWeight: '600' },
  yearDivider: {
    marginHorizontal: -14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  yearDividerText: { fontSize: 16, color: '#3C3C43', fontWeight: '700', letterSpacing: 0.5 },
  emptyText: { textAlign: 'center', color: '#C7C7CC', fontSize: 14, paddingVertical: 20 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  attSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
    gap: 10,
  },
  attSheetScroll: { gap: 10, paddingBottom: 16 },
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
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
  },
  datePickerText: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  calendar: {
    borderRadius: 12,
    overflow: 'hidden',
  },
});
