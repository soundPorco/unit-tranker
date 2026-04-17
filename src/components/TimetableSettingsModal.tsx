import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TimetableSettings, DaysMode, Semester, Class } from '../types';

const SEMESTER_OPTIONS: Semester[] = ['前期', '後期'];

const DAYS_MODE_MAX: Record<DaysMode, number> = {
  weekdays: 4,
  weekdays_sat: 5,
  all: 6,
};

const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

interface Props {
  visible: boolean;
  settings: TimetableSettings;
  academicYear: number;
  semester: Semester;
  classes: Class[];
  onSave: (s: TimetableSettings, academicYear: number, semester: Semester, classIdsToDelete: string[]) => void;
  onClose: () => void;
}

const DAYS_OPTIONS: { value: DaysMode; label: string }[] = [
  { value: 'weekdays',     label: '平日のみ' },
  { value: 'weekdays_sat', label: '平日+土' },
  { value: 'all',          label: '全曜日' },
];

export function TimetableSettingsModal({ visible, settings, academicYear, semester, classes, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<TimetableSettings>(settings);
  const [draftYear, setDraftYear] = useState(academicYear);
  const [draftSemester, setDraftSemester] = useState<Semester>(semester);

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAffected, setPendingAffected] = useState<Class[]>([]);

  useEffect(() => {
    if (visible) {
      setDraft(settings);
      setDraftYear(academicYear);
      setDraftSemester(semester);
    }
  }, [visible, settings, academicYear, semester]);

  const setTime = (idx: number, field: 'start' | 'end', val: string) => {
    const times = draft.periodTimes.map((t, i) => i === idx ? { ...t, [field]: val } : t);
    setDraft(d => ({ ...d, periodTimes: times }));
  };

  const handleSave = () => {
    const newMaxDay = DAYS_MODE_MAX[draft.daysMode];
    const hiddenByDay = classes.filter(c => c.day_of_week > newMaxDay);
    const hiddenByPeriod = classes.filter(c => c.period > draft.periodCount);
    const affected = [...hiddenByDay, ...hiddenByPeriod.filter(c => !hiddenByDay.find(d => d.id === c.id))];

    if (affected.length === 0) {
      onSave(draft, draftYear, draftSemester, []);
      onClose();
      return;
    }

    setPendingAffected(affected);
    setConfirmVisible(true);
  };

  const handleConfirmDelete = () => {
    setConfirmVisible(false);
    onSave(draft, draftYear, draftSemester, pendingAffected.map(c => c.id));
    onClose();
  };

  const handleCancelConfirm = () => {
    setConfirmVisible(false);
    setPendingAffected([]);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.container}>
          {/* ヘッダー */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.title}>時間割の設定</Text>
            <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
              <Text style={styles.saveText}>保存</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

              {/* 年度 */}
              <Text style={styles.sectionLabel}>年度</Text>
              <View style={styles.card}>
                <View style={styles.yearRow}>
                  <TouchableOpacity
                    style={styles.yearBtn}
                    onPress={() => setDraftYear(y => y - 1)}
                  >
                    <Ionicons name="remove" size={20} color="#3eb370" />
                  </TouchableOpacity>
                  <Text style={styles.yearText}>{draftYear}年度</Text>
                  <TouchableOpacity
                    style={styles.yearBtn}
                    onPress={() => setDraftYear(y => y + 1)}
                  >
                    <Ionicons name="add" size={20} color="#3eb370" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 学期 */}
              <Text style={styles.sectionLabel}>学期</Text>
              <View style={[styles.card, styles.row]}>
                {SEMESTER_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.segmentBtn, draftSemester === s && styles.segmentActive]}
                    onPress={() => setDraftSemester(s)}
                  >
                    <Text style={[styles.segmentText, draftSemester === s && styles.segmentTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 表示曜日 */}
              <Text style={styles.sectionLabel}>表示曜日</Text>
              <View style={[styles.card, styles.row]}>
                {DAYS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.segmentBtn, draft.daysMode === opt.value && styles.segmentActive]}
                    onPress={() => setDraft(d => ({ ...d, daysMode: opt.value }))}
                  >
                    <Text style={[styles.segmentText, draft.daysMode === opt.value && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 時限数 */}
              <Text style={styles.sectionLabel}>時限数</Text>
              <View style={[styles.card, styles.row, { flexWrap: 'wrap', gap: 8 }]}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.periodNumBtn, draft.periodCount === n && styles.periodNumActive]}
                    onPress={() => setDraft(d => ({ ...d, periodCount: n }))}
                  >
                    <Text style={[styles.periodNumText, draft.periodCount === n && styles.periodNumTextActive]}>
                      {n}限
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* 各時限の時間 */}
              <Text style={styles.sectionLabel}>各時限の時間</Text>
              <View style={styles.card}>
                {Array.from({ length: draft.periodCount }, (_, i) => i).map(idx => (
                  <View
                    key={idx}
                    style={[styles.timeRow, idx < draft.periodCount - 1 && styles.timeRowBorder]}
                  >
                    <Text style={styles.timeLabel}>{idx + 1}限</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={draft.periodTimes[idx]?.start ?? ''}
                      onChangeText={v => setTime(idx, 'start', v)}
                      placeholder="09:00"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={styles.timeSep}>〜</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={draft.periodTimes[idx]?.end ?? ''}
                      onChangeText={v => setTime(idx, 'end', v)}
                      placeholder="10:30"
                      placeholderTextColor="#C7C7CC"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                ))}
              </View>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={confirm.overlay}>
          <View style={confirm.card}>
            <View style={confirm.iconWrap}>
              <Ionicons name="trash-outline" size={28} color="#FF3B30" />
            </View>

            <Text style={confirm.title}>
              {pendingAffected.length}件の講義が削除されます
            </Text>
            <Text style={confirm.subtitle}>
              設定変更により表示範囲外となる講義を削除します。この操作は取り消せません。
            </Text>

            <ScrollView style={confirm.list} contentContainerStyle={confirm.listContent}>
              {pendingAffected.map(c => (
                <View key={c.id} style={confirm.classRow}>
                  <View style={confirm.classDot} />
                  <Text style={confirm.className}>{c.name}</Text>
                  <Text style={confirm.classSlot}>
                    {DAY_LABELS[c.day_of_week]}曜 {c.period}限
                  </Text>
                </View>
              ))}
            </ScrollView>

            <View style={confirm.btnRow}>
              <TouchableOpacity style={confirm.btnCancel} onPress={handleCancelConfirm}>
                <Text style={confirm.btnCancelText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={confirm.btnDelete} onPress={handleConfirmDelete}>
                <Text style={confirm.btnDeleteText}>削除する</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: 0.5,
    borderBottomColor: '#C6C6C8',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#1C1C1E' },
  cancelBtn: { minWidth: 60 },
  cancelText: { fontSize: 17, color: '#3eb370' },
  saveBtn: { minWidth: 60, alignItems: 'flex-end' },
  saveText: { fontSize: 17, color: '#3eb370', fontWeight: '600' },

  scroll: { padding: 16, gap: 4, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 13,
    color: '#6C6C70',
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },

  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  yearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    minWidth: 120,
    textAlign: 'center',
  },

  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  segmentActive: { backgroundColor: '#3eb370' },
  segmentText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '600' },

  periodNumBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
  },
  periodNumActive: { backgroundColor: '#3eb370' },
  periodNumText: { fontSize: 14, color: '#3C3C43', fontWeight: '500' },
  periodNumTextActive: { color: '#FFFFFF', fontWeight: '600' },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  timeRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  timeLabel: {
    width: 32,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  timeInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 15,
    color: '#1C1C1E',
    textAlign: 'center',
  },
  timeSep: {
    fontSize: 14,
    color: '#8E8E93',
  },
});

const confirm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF1F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#6C6C70',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  list: {
    width: '100%',
    maxHeight: 180,
    marginBottom: 20,
  },
  listContent: {
    gap: 10,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9FB',
    borderRadius: 8,
  },
  classDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  className: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  classSlot: {
    fontSize: 13,
    color: '#8E8E93',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  btnCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C3C43',
  },
  btnDelete: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
  },
  btnDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
