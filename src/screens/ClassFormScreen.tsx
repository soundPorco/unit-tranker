import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useClasses } from '../hooks/useClasses';
import { TimetableStackParamList, ClassType } from '../types';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${DAY_LABELS[d.getDay()]})`;
}

type Route = RouteProp<TimetableStackParamList, 'ClassForm'>;

const DAYS = ['月', '火', '水', '木', '金', '土', '日'];

const CLASS_TYPE_OPTIONS: { value: ClassType; label: string }[] = [
  { value: 'required',          label: '必修'     },
  { value: 'elective_required', label: '選択必修' },
  { value: 'elective',          label: '選択'     },
];

// ラベル付き入力カードの行
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowRight}>{children}</View>
    </View>
  );
}

// セグメント選択ボタン群
function SegmentPicker<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.segment}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[s.segBtn, value === opt.value && s.segBtnActive]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[s.segText, value === opt.value && s.segTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function ClassFormScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { classData, day, period, timetableId } = route.params ?? {};
  const { addClass, updateClass, deleteClass } = useClasses(timetableId);

  const [name,       setName]       = useState(classData?.name ?? '');
  const [teacher,    setTeacher]    = useState(classData?.teacher ?? '');
  const [room,       setRoom]       = useState(classData?.room ?? '');
  const [credits,    setCredits]    = useState(classData?.credits?.toString() ?? '2');
  const [classType,  setClassType]  = useState<ClassType | null>(classData?.class_type ?? null);
  const [examDate,        setExamDate]        = useState(classData?.exam_date ?? '');
  const [showExamCalendar, setShowExamCalendar] = useState(false);
  const [memo,            setMemo]            = useState(classData?.memo ?? '');
  const [saving,          setSaving]          = useState(false);

  const isEdit = !!classData;
  const currentDay    = classData?.day_of_week ?? day ?? 0;
  const currentPeriod = classData?.period ?? period ?? 1;

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('エラー', '講義名を入力してください'); return; }
    const creditsNum = credits.trim() ? parseInt(credits.trim(), 10) : null;
    if (credits.trim() && (isNaN(creditsNum!) || creditsNum! < 1 || creditsNum! > 10)) {
      Alert.alert('エラー', '単位数は1〜10の数値を入力してください'); return;
    }
    setSaving(true);
    const payload = {
      name:             name.trim(),
      teacher:          teacher.trim() || null,
      room:             room.trim() || null,
      credits:          creditsNum,
      class_type:       classType,
      day_of_week:      currentDay,
      period:           currentPeriod,
      evaluation_type:  'balanced' as const,
      exam_date:        examDate.trim() || null,
      exam_type:        null,
      memo:             memo.trim() || null,
    };
    const error = isEdit
      ? await updateClass(classData!.id, payload)
      : await addClass(payload as any);
    setSaving(false);
    if (error) { Alert.alert('エラー', error.message); return; }
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('削除確認', `「${classData?.name}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除', style: 'destructive', onPress: async () => {
          await deleteClass(classData!.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* 曜日・限数バナー */}
          <View style={s.banner}>
            <Text style={s.bannerText}>{DAYS[currentDay]}曜 {currentPeriod}限</Text>
          </View>

          {/* ─── 基本情報 ─── */}
          <Text style={s.sectionLabel}>基本情報</Text>
          <View style={s.card}>
            <FormRow label="講義名 *">
              <TextInput
                style={s.textInput}
                value={name}
                onChangeText={setName}
                placeholder="例：微分積分学"
                placeholderTextColor="#C7C7CC"
              />
            </FormRow>
            <View style={s.divider} />
            <FormRow label="教員名">
              <TextInput
                style={s.textInput}
                value={teacher}
                onChangeText={setTeacher}
                placeholder="例：山田 太郎"
                placeholderTextColor="#C7C7CC"
              />
            </FormRow>
            <View style={s.divider} />
            <FormRow label="教室">
              <TextInput
                style={s.textInput}
                value={room}
                onChangeText={setRoom}
                placeholder="例：A棟 201号室"
                placeholderTextColor="#C7C7CC"
              />
            </FormRow>
          </View>

          {/* ─── 単位・区分 ─── */}
          <Text style={s.sectionLabel}>単位・区分</Text>
          <View style={s.card}>
            <FormRow label="単位数">
              <TextInput
                style={[s.textInput, s.shortInput]}
                value={credits}
                onChangeText={setCredits}
                placeholder="例：2"
                placeholderTextColor="#C7C7CC"
                keyboardType="number-pad"
                maxLength={2}
              />
            </FormRow>
            <View style={s.divider} />
            <View style={s.vertRow}>
              <Text style={s.rowLabel}>区分</Text>
              <SegmentPicker
                options={CLASS_TYPE_OPTIONS}
                value={classType}
                onChange={setClassType}
              />
            </View>
          </View>

          {/* ─── 評価 ─── */}
          <Text style={s.sectionLabel}>評価</Text>
          <View style={s.card}>
            <View style={s.row}>
              <Text style={s.rowLabel}>試験日</Text>
              <View style={s.rowRight}>
                <View style={s.datePickerRow}>
                  <TouchableOpacity
                    style={s.datePicker}
                    onPress={() => setShowExamCalendar(v => !v)}
                  >
                    <Ionicons name="calendar-outline" size={16} color="#007AFF" />
                    <Text style={[s.datePickerText, !examDate && s.datePickerPlaceholder]}>
                      {examDate ? formatDate(examDate) : '日付を選択'}
                    </Text>
                    <Ionicons
                      name={showExamCalendar ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color="#8E8E93"
                    />
                  </TouchableOpacity>
                  {examDate ? (
                    <TouchableOpacity
                      onPress={() => { setExamDate(''); setShowExamCalendar(false); }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="close-circle" size={24} color="#C7C7CC" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
            {showExamCalendar && (
              <Calendar
                current={examDate || undefined}
                onDayPress={(day: { dateString: string }) => {
                  setExamDate(day.dateString);
                  setShowExamCalendar(false);
                }}
                markedDates={examDate ? { [examDate]: { selected: true, selectedColor: '#007AFF' } } : {}}
                theme={{
                  arrowColor: '#007AFF',
                  selectedDayBackgroundColor: '#007AFF',
                }}
                style={s.calendar}
              />
            )}
          </View>

          {/* ─── メモ ─── */}
          <Text style={s.sectionLabel}>メモ</Text>
          <View style={s.card}>
            <TextInput
              style={s.memoInput}
              value={memo}
              onChangeText={setMemo}
              placeholder="評価基準や特記事項など"
              placeholderTextColor="#C7C7CC"
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* 保存ボタン */}
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{isEdit ? '更新' : '登録'}</Text>
          </TouchableOpacity>

          {isEdit && (
            <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
              <Text style={s.deleteBtnText}>この講義を削除</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { padding: 16, paddingBottom: 40 },

  banner: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  bannerText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6C6C70',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginLeft: 4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 24,
    overflow: 'hidden',
  },

  divider: { height: 0.5, backgroundColor: '#E5E5EA' },

  // 横並び行（ラベル左、入力右）
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  rowLabel: { fontSize: 15, color: '#1C1C1E', fontWeight: '400', width: 80 },
  rowRight: { flex: 1 },

  // 縦並び行（ラベル上、選択肢下）
  vertRow: {
    paddingVertical: 12,
    gap: 10,
  },

  textInput: {
    fontSize: 15,
    color: '#1C1C1E',
    flex: 1,
    textAlign: 'right',
  },
  shortInput: { flex: 0, width: 60 },

  // セグメント
  segment: { flexDirection: 'row', gap: 6 },
  segBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  segBtnActive: { backgroundColor: '#007AFF' },
  segText: { fontSize: 13, color: '#3C3C43', fontWeight: '500' },
  segTextActive: { color: '#FFFFFF', fontWeight: '600' },

  memoInput: {
    fontSize: 15,
    color: '#1C1C1E',
    minHeight: 80,
    paddingVertical: 12,
    lineHeight: 22,
  },

  saveBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  deleteBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteBtnText: { color: '#FF3B30', fontSize: 15 },

  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  datePickerText: { fontSize: 15, color: '#1C1C1E' },
  datePickerPlaceholder: { color: '#C7C7CC' },

  calendar: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },

});
